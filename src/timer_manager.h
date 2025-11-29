#ifndef REQUEST_UNRAVER_TIMER_MANAGER_H_
#define REQUEST_UNRAVER_TIMER_MANAGER_H_

#include <cstdint>
#include <quickjs.h>
#include <list.h>

namespace request_unraver {

struct JsOsTimer {
  struct list_head link;
  int64_t timer_id;
  uint8_t repeats : 1;
  int64_t timeout;
  int64_t delay;
  JSValue func;
};

struct JsThreadState {
  struct list_head os_timers;
  int64_t next_timer_id;
};

class TimerManager {
 public:
  explicit TimerManager(JSRuntime* rt);
  ~TimerManager();

  // setTimeout/setInterval 구현
  JSValue SetTimeoutImpl(JSContext* ctx, JSValueConst this_val, int argc,
                         JSValueConst* argv, int magic);

  // clearTimeout/clearInterval 구현
  JSValue ClearTimeoutImpl(JSContext* ctx, JSValueConst this_val, int argc,
                           JSValueConst* argv);

  // 타이머 실행 (min_delay 출력)
  int RunTimers(JSContext* ctx, int* min_delay);

  // 활성 타이머 확인
  bool HasTimers() const;

  // 초기화된 thread_state 반환 (rt opaque 설정됨)
  JsThreadState* thread_state() const { return thread_state_; }

 private:
  // 헬퍼 함수들
  static uint64_t GetTimeMs();
  static int CallHandler(JSContext* ctx, JSValue func);
  void FreeTimer(JsOsTimer* th);
  JsOsTimer* FindTimerById(int64_t timer_id);

  JsThreadState* thread_state_;
  JSRuntime* runtime_;
};

}  // namespace request_unraver

#endif  // REQUEST_UNRAVER_TIMER_MANAGER_H_