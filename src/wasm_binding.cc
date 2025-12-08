#include <emscripten/emscripten.h>

#include "engine.h"
#include "wasm_binding.h"

#include <walink.h>
#include <msgpack.hpp>

using namespace walink;

extern "C" {

#define EXPORT EMSCRIPTEN_KEEPALIVE

  // 사용자 정의 태그: Engine 인스턴스 식별자
#define RU_TAG_ENGINE_INSTANCE 0x1000001
  // 사용자 정의 태그: JS_VALUE 인스턴스 식별자
#define RU_TAG_JS_VALUE_MASK   0xf000000
#define RU_TAG_JS_VALUE_BIT    0x2000000
#define RU_TAG_JS_VALUE_TAG    0x0ffffff

static WL_VALUE js_value_to_wl(JSValue v) {
  return wl_make(RU_TAG_JS_VALUE_BIT | wl_build_meta((v >> 32) & RU_TAG_JS_VALUE_TAG, false, false, true), v);
}

static JSValue wl_is_js_value(WL_VALUE v) {
  return (wl_get_tag(v) & RU_TAG_JS_VALUE_MASK) == RU_TAG_JS_VALUE_BIT;
}

static JSValue js_value_from_wl(WL_VALUE v) {
  uint32_t meta = wl_get_meta(v);
  if (!(meta & WL_META_USER_DEFINED) || ((meta & RU_TAG_JS_VALUE_MASK) != RU_TAG_JS_VALUE_BIT)) {
    throw std::runtime_error("invalid tag");
  }
  uint32_t js_tag = wl_get_tag(v) & RU_TAG_JS_VALUE_TAG;
  if (js_tag & 0x00800000) {
    js_tag  |= 0xff000000;
  }
  JSValue js_value = (((uint64_t)js_tag) << 32) | wl_get_payload32(v);
  return js_value;
}

  //
  // Helper: 안전하게 WL_VALUE에서 Engine*를 복원
  //
  static request_unraver::Engine* recover_engine_from_wl(WL_VALUE v) {
  if (!wl_is_address(v)) return nullptr;
  if (wl_get_tag(v) != RU_TAG_ENGINE_INSTANCE) return nullptr;
  const uint32_t payload = wl_get_payload32(v);
  return reinterpret_cast<request_unraver::Engine*>(payload);
}

//
// engine_new
//   - Engine 인스턴스 생성 및 초기화 시도
//   - 성공: WL_VALUE (address, tag = RU_TAG_ENGINE_INSTANCE, free_flag = false)
//   - 실패: WL_TAG_ERROR (wl_make_error)
//
EXPORT WL_VALUE engine_new(WL_VALUE mode) {
  using namespace request_unraver;
  using namespace walink;

  auto* eng = new Engine();

  if (!eng->Init(wl_to_uint32(mode))) {
    delete eng;
    return wl_make_error("engine_new: Init() failed");
  }

  // 인스턴스 포인터를 반환 (free_flag = false, 생성/소멸은 engine_cleanup으로 관리)
  return wl_from_address(eng, RU_TAG_ENGINE_INSTANCE, /*free_flag_for_receiver*/ false);
}

//
// engine_cleanup
//   - Engine 인스턴스 제거
//   - 입력이 올바르지 않으면 false 반환
//
EXPORT WL_VALUE engine_cleanup(WL_VALUE engine_instance) {
  using namespace walink;

  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) {
    return wl_from_bool(false);
  }

  // 안전하게 종료 및 메모리 해제
  eng->Shutdown();
  delete eng;

  return wl_from_bool(true);
}

//
// engine_has_timers
//
EXPORT WL_VALUE engine_has_timers(WL_VALUE engine_instance) {
  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) return wl_from_bool(false);
  return wl_from_bool(eng->HasTimers());
}

//
// engine_has_pending_jobs
//
EXPORT WL_VALUE engine_has_pending_jobs(WL_VALUE engine_instance) {
  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) return wl_from_bool(false);
  return wl_from_bool(eng->HasPendingJobs());
}

WL_VALUE js_value_to_msgp_wl(JSContext* ctx, JSValue v) {
  JSValue global_obj = JS_GetGlobalObject(ctx);
  JSValue sys_obj = JS_GetPropertyStr(ctx, global_obj, "__sys");
  JSValue mpack_func = JS_GetPropertyStr(ctx, sys_obj, "mpack");

  WL_VALUE wl_value;
  JSValue r;

  if (JS_IsException(v)) {
    r = v;
  } else {
    JSValueConst args[1] = {
      v
    };
    r = JS_Call(ctx, mpack_func, JS_UNDEFINED, 1, args);
  }
  if (JS_IsException(r)) {
    std::string err_msg = request_unraver::Engine::js_error_to_string(ctx, r);
    wl_value = wl_make_error(err_msg);
  } else if (JS_IsNull(r) || JS_IsUndefined(r)) {
    wl_value = 0;
  } else {
    size_t size = 0;
    uint8_t* data = JS_GetUint8Array(ctx, &size, r);
    wl_value = wl_make_msgpack(std::string_view((const char*)data, size), true);
  }

  JS_FreeValue(ctx, mpack_func);
  JS_FreeValue(ctx, sys_obj);
  JS_FreeValue(ctx, global_obj);

  return wl_value;
}

//
// engine_js_eval
//   - string_code: WL_VALUE (address-based, WL_TAG_STRING expected)
//   - 성공: WL_VALUE (address-based, tag = WL_TAG_OBJECT) -- free_flag = true
//   - 실패: WL_VALUE (address-based, tag = WL_TAG_ERROR) -- free_flag = true
//
EXPORT WL_VALUE engine_js_eval(WL_VALUE engine_instance, WL_VALUE string_code) {
  using namespace walink;

  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) {
    return wl_make_error("engine_js_eval: invalid engine instance");
  }

  std::string code = wl_to_string(string_code, true);

  JSContext* ctx = eng->context();
  if (!ctx) {
    return wl_make_error("engine_js_eval: engine has no JSContext");
  }

  // Evaluate
  JSValue result = JS_Eval(ctx, code.c_str(), code.length(), "<engine_js_eval>", JS_EVAL_TYPE_GLOBAL);
  return js_value_to_msgp_wl(ctx, result);
}

EXPORT WL_VALUE engine_create_window(WL_VALUE engine_instance, WL_VALUE wl_content, WL_VALUE wl_windows_options) {
  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);

  std::string content = wl_content ? wl_to_string(wl_content, true) : "";
  std::string windows_options = wl_windows_options ? wl_to_msgpack(wl_windows_options, true) : "";

  JSValue js_window = eng->CreateWindow(
    content.empty() ? nullptr : content.c_str(),
    windows_options.empty() ? nullptr : (const uint8_t*)windows_options.c_str(),
    windows_options.length()
  );
  return js_value_to_wl(js_window);
}

EXPORT WL_VALUE engine_use_jquery(WL_VALUE engine_instance, WL_VALUE window) {
  using namespace walink;

  JSValue window_obj = js_value_from_wl(window);

  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) {
    return wl_make_error("engine_js_eval: invalid engine instance");
  }

  JSContext *ctx = eng->context();

  std::string script_template = "(function (window) {\n";
  script_template += "return __sys.useJQuery(window);\n";
  script_template += "\n})";

  JSValue r = JS_Eval(ctx, script_template.c_str(), script_template.length(), "<browser_eval>", JS_EVAL_TYPE_GLOBAL);
  if (!JS_IsException(r)) {
    JSValueConst args[1] = {
      window_obj,
    };
    JSValue ret = JS_Call(ctx, r, window_obj, 1, args);
    JS_FreeValue(ctx, r);
    r = ret;
  }

  if (JS_IsException(r)) {
    std::string error_msg = eng->js_error_to_string(ctx, r);
    return wl_make_error(error_msg);
  }

  JS_FreeValue(ctx, r);

  return 0;
}

EXPORT WL_VALUE engine_browser_eval(WL_VALUE engine_instance, WL_VALUE window, WL_VALUE string_code, WL_VALUE wl_params) {
  using namespace walink;

  JSValue window_obj = js_value_from_wl(window);
  std::string code = wl_to_string(string_code, true);
  std::string params = wl_params ? wl_to_msgpack(wl_params, true) : "";

  request_unraver::Engine* eng = recover_engine_from_wl(engine_instance);
  if (!eng) {
    return wl_make_error("engine_js_eval: invalid engine instance");
  }

  JSContext *ctx = eng->context();

  JSValue global_obj = JS_GetGlobalObject(ctx);
  std::string script_template = "(function (global, window, _raw_params) {";
  script_template += "const document = window.document; const jQuery = window.jQuery; const $ = window.$;";
  script_template += "const params = _raw_params ? __sys.munpack(_raw_params) : null;";
  script_template += code;
  script_template += "\n})";

  JSValue js_params_raw = params.empty() ? JS_NULL : JS_NewUint8ArrayCopy(ctx, (const uint8_t*) params.c_str(), params.length());

  JSValue r = JS_Eval(ctx, script_template.c_str(), script_template.length(), "<browser_eval>", JS_EVAL_TYPE_GLOBAL);
  if (!JS_IsException(r)) {
    JSValueConst args[3] = {
      global_obj,
      window_obj,
      js_params_raw,
    };
    JSValue ret = JS_Call(ctx, r, window_obj, 3, args);
    JS_FreeValue(ctx, r);
    r = ret;
  }
  JS_FreeValue(ctx, global_obj);

  if (js_params_raw != JS_NULL) {
    JS_FreeValue(ctx, js_params_raw);
  }

  WL_VALUE wl_return;
  if (JS_IsException(r)) {
    std::string error_msg = eng->js_error_to_string(ctx, r);
    wl_return = wl_make_error(error_msg);
  } else {
    wl_return = js_value_to_msgp_wl(ctx, r);
  }

  JS_FreeValue(ctx, r);

  return wl_return;
}

} // extern "C"