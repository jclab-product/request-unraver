#include "timer_manager.h"

#include <emscripten.h>
#include <cutils.h>
#include <list.h>
#include <cstdlib>
#include <algorithm> // std::min을 위해 추가

namespace request_unraver {

namespace {

inline void InitListHead(struct list_head* head) {
  head->next = head;
  head->prev = head;
}

}  // anonymous

TimerManager::TimerManager(JSRuntime* rt) : runtime_(rt), thread_state_(nullptr) {
  thread_state_ = static_cast<JsThreadState*>(
      js_mallocz_rt(rt, sizeof(JsThreadState)));
  if (thread_state_) {
    InitListHead(&thread_state_->os_timers);
    thread_state_->next_timer_id = 1;
  }
}

TimerManager::~TimerManager() {
  // 소멸자는 cleanup에서 처리
}

uint64_t TimerManager::GetTimeMs() {
  return static_cast<uint64_t>(emscripten_get_now());
}

int TimerManager::CallHandler(JSContext* ctx, JSValue func) {
  int ret = 0;
  JSValue func_copy = JS_DupValue(ctx, func);
  JSValue result = JS_Call(ctx, func_copy, JS_UNDEFINED, 0, nullptr);
  JS_FreeValue(ctx, func_copy);
  if (JS_IsException(result)) {
    ret = -1;
  }
  JS_FreeValue(ctx, result);
  return ret;
}

void TimerManager::FreeTimer(JsOsTimer* th) {
  list_del(&th->link);
  JS_FreeValueRT(runtime_, th->func);
  js_free_rt(runtime_, th);
}

JsOsTimer* TimerManager::FindTimerById(int64_t timer_id) {
  if (!thread_state_ || timer_id <= 0) {
    return nullptr;
  }
  struct list_head* el;
  list_for_each(el, &thread_state_->os_timers) {
    JsOsTimer* th = list_entry(el, JsOsTimer, link);
    if (th->timer_id == timer_id) {
      return th;
    }
  }
  return nullptr;
}

int TimerManager::RunTimers(JSContext* ctx, int* min_delay) {
  if (list_empty(&thread_state_->os_timers)) {
    *min_delay = -1;
    return 0;
  }

  int64_t cur_time = static_cast<int64_t>(GetTimeMs());
  *min_delay = INT32_MAX;

  struct list_head* el;
  list_for_each(el, &thread_state_->os_timers) {
    JsOsTimer* th = list_entry(el, JsOsTimer, link);
    int64_t delay = th->timeout - cur_time;
    if (delay > 0) {
      *min_delay = std::min(*min_delay, static_cast<int>(delay));
    } else {
      *min_delay = 0;
      JSValue func = JS_DupValueRT(runtime_, th->func);
      if (th->repeats) {
        th->timeout = cur_time + th->delay;
      } else {
        FreeTimer(th);
      }
      int ret = CallHandler(ctx, func);
      JS_FreeValueRT(runtime_, func);
      return ret;
    }
  }
  return 0;
}

JSValue TimerManager::SetTimeoutImpl(JSContext* ctx, JSValueConst this_val,
                                     int argc, JSValueConst* argv, int magic) {
  if (!thread_state_) {
    return JS_ThrowInternalError(ctx, "Thread state not initialized");
  }

  JSValueConst func = argv[0];
  if (!JS_IsFunction(ctx, func)) {
    return JS_ThrowTypeError(ctx, "not a function");
  }

  int64_t delay;
  if (JS_ToInt64(ctx, &delay, argv[1])) {
    return JS_EXCEPTION;
  }
  if (delay < 1) {
    delay = 1;
  }

  JsOsTimer* th = static_cast<JsOsTimer*>(
      js_mallocz(ctx, sizeof(JsOsTimer)));
  if (!th) {
    return JS_EXCEPTION;
  }

  th->timer_id = thread_state_->next_timer_id++;
  constexpr int64_t kMaxSafeInteger = (((int64_t)1 << 53) - 1);
  if (thread_state_->next_timer_id > kMaxSafeInteger) {
    thread_state_->next_timer_id = 1;
  }
  th->repeats = (magic > 0);
  th->timeout = static_cast<int64_t>(GetTimeMs()) + delay;
  th->delay = delay;
  th->func = JS_DupValue(ctx, func);
  list_add_tail(&th->link, &thread_state_->os_timers);

  return JS_NewInt64(ctx, th->timer_id);
}

JSValue TimerManager::ClearTimeoutImpl(JSContext* ctx,
                                       JSValueConst this_val, int argc,
                                       JSValueConst* argv) {
  int64_t timer_id;
  if (JS_ToInt64(ctx, &timer_id, argv[0])) {
    return JS_EXCEPTION;
  }
  JsOsTimer* th = FindTimerById(timer_id);
  if (!th) {
    return JS_UNDEFINED;
  }
  FreeTimer(th);
  return JS_UNDEFINED;
}

bool TimerManager::HasTimers() const {
  return thread_state_ && !list_empty(&thread_state_->os_timers);
}

}  // namespace request_unraver