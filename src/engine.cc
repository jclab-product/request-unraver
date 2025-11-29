#include "engine.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <string>
#include <vector>

#include "util.h"

extern "C" {
#include <cutils.h>
#include <quickjs.h>
#include <squash.h>
}

#include "static_vfs_data.h"
#include "vfs_manager.h"

namespace request_unraver {

// 정적 멤버 초기화
Engine* Engine::instance_ = nullptr;

// QuickJS C 함수 바인딩을 위한 헬퍼
// Engine 인스턴스를 가져와 해당 멤버 함수를 호출
static JSValue JsConsoleLogBinding(JSContext* ctx, JSValueConst this_val,
                                   int argc, JSValueConst* argv) {
  return Engine::GetInstance()->JsConsoleLog(ctx, this_val, argc, argv);
}

static JSValue JsRequireBinding(JSContext* ctx, JSValueConst this_val,
                                int argc, JSValueConst* argv) {
  return Engine::GetInstance()->JsRequire(ctx, this_val, argc, argv);
}

static JSValue JsSetTimeoutBinding(JSContext* ctx, JSValueConst this_val,
                                   int argc, JSValueConst* argv, int magic) {
  return Engine::GetInstance()->timer_manager()->SetTimeoutImpl(
      ctx, this_val, argc, argv, magic);
}

static JSValue JsClearTimeoutBinding(JSContext* ctx, JSValueConst this_val,
                                     int argc, JSValueConst* argv) {
  return Engine::GetInstance()->timer_manager()->ClearTimeoutImpl(
      ctx, this_val, argc, argv);
}

// static JSModuleDef* JsModuleLoaderBinding(JSContext* ctx, const char* module_name, void* opaque) {
  // return Engine::GetInstance()->ModuleLoader(ctx, module_name, opaque);
// }

Engine* Engine::GetInstance() {
  if (!instance_) {
    instance_ = new Engine();
  }
  return instance_;
}

void Engine::CleanupInstance() {
  if (instance_) {
    delete instance_;
    instance_ = nullptr;
  }
}

Engine::Engine() : rt_(nullptr), ctx_(nullptr) {}

Engine::~Engine() {
  Shutdown();
}

bool Engine::Init() {
  if (rt_ != nullptr) {
    return true;  // 이미 초기화됨
  }

  if (!InitializeRuntime()) {
    return false;
  }

  vfs_manager_ = std::make_unique<VfsManager>();
  if (!InitializeVfs()) {
    Shutdown();
    return false;
  }

  timer_manager_ = std::make_unique<TimerManager>(rt_);
  if (!timer_manager_->thread_state()) {
    fprintf(stderr, "Failed to initialize TimerManager thread state.\n");
    Shutdown();
    return false;
  }

  RegisterGlobals();

  // Issue: https://github.com/quickjs-ng/quickjs/issues/774
  // Eval("Array.prototype.toString = Object.prototype.toString");
  Eval("require(\"sysfs:///pseudo-browser.js\");");

  return true;
}

void Engine::Shutdown() {
  if (rt_) {
    // TimerManager 소멸자가 타이머 정리
    timer_manager_.reset();

    // Runtime opaque 해제
    JS_SetRuntimeOpaque(rt_, nullptr);
  }

  if (vfs_manager_) {
    vfs_manager_->Shutdown();
  }

  if (ctx_) {
    JS_FreeContext(ctx_);
    ctx_ = nullptr;
  }
  if (rt_) {
    JS_FreeRuntime(rt_);
    rt_ = nullptr;
  }
}

bool Engine::InitializeRuntime() {
  rt_ = JS_NewRuntime();
  if (!rt_) {
    fprintf(stderr, "Failed to create QuickJS runtime.\n");
    return false;
  }

  JS_SetCanBlock(rt_, 1);  // Promise 지원을 위한 설정
  // JS_SetModuleLoaderFunc(rt_, nullptr, JsModuleLoaderBinding, nullptr);

  ctx_ = JS_NewContext(rt_);
  if (!ctx_) {
    fprintf(stderr, "Failed to create QuickJS context.\n");
    JS_FreeRuntime(rt_);
    rt_ = nullptr;
    return false;
  }
  return true;
}

bool Engine::InitializeVfs() {
  if (!vfs_manager_->Init(embedded::static_vfs_data, embedded::static_vfs_size)) {
    fprintf(stderr, "Failed to initialize VfsManager.\n");
    return false;
  }
  return true;
}

void Engine::RegisterGlobals() {
  JSValue global_obj = JS_GetGlobalObject(ctx_);
  JSValue v;

  // setTimeout/setInterval
  JS_SetPropertyStr(ctx_, global_obj, "setTimeout",
                    JS_NewCFunctionMagic(ctx_, JsSetTimeoutBinding, "setTimeout", 2,
                                         JS_CFUNC_generic_magic, 0));
  JS_SetPropertyStr(ctx_, global_obj, "setInterval",
                    JS_NewCFunctionMagic(ctx_, JsSetTimeoutBinding, "setInterval", 2,
                                         JS_CFUNC_generic_magic, 1));

  // clearTimeout/clearInterval
  JS_SetPropertyStr(ctx_, global_obj, "clearTimeout",
                    JS_NewCFunction(ctx_, JsClearTimeoutBinding, "clearTimeout",
                                    1));
  JS_SetPropertyStr(ctx_, global_obj, "clearInterval",
                    JS_NewCFunction(ctx_, JsClearTimeoutBinding, "clearInterval",
                                    1));

  // console 객체
  JSValue console_obj = JS_NewObject(ctx_);
  JS_SetPropertyStr(ctx_, console_obj, "log",
                    JS_NewCFunction(ctx_, JsConsoleLogBinding, "log", 1));
  JS_SetPropertyStr(ctx_, global_obj, "console", console_obj);

  JS_SetPropertyStr(ctx_, global_obj, "require",
    JS_NewCFunction(ctx_, JsRequireBinding, "require", 1));

  v = LoadCjsModule(ctx_, "sysfs:///init.js", nullptr, true);
  if (JS_IsException(v)) {
    js_std_dump_error(ctx_);
  }
  JS_FreeValue(ctx_, v);

  v = LoadCjsModule(ctx_, "node:url", nullptr, true);
  if (JS_IsException(v)) {
    js_std_dump_error(ctx_);
    JS_FreeValue(ctx_, v);
  } else {
    JS_SetPropertyStr(ctx_, global_obj, "URL", v);
  }

  JS_FreeValue(ctx_, global_obj);
}

// Helper functions for require()
std::string Engine::Basename(const std::string& path) {
  size_t idx = path.rfind('/');
  if (idx == std::string::npos) {
    return ".";
  }
  if (idx == 0) {
    return "/";
  }
  return path.substr(0, idx);
}

Engine::StatResult Engine::StatPath(const std::string& path) {
  StatResult result;
  result.error_code = 0; // No error
  result.is_file = false;
  result.is_directory = false;

  if (!vfs_manager_) {
    result.error_code = -1; // Indicate VFS not initialized
    return result;
  }

  struct stat st;
  int ret = squash_stat(vfs_manager_->vfs(), path.c_str(), &st);
printf("stat: %s -> %d\n", path.c_str(), ret);
  if (ret < 0) {
    result.error_code = ret;
    return result;
  }

  if (S_ISREG(st.st_mode)) {
    result.is_file = true;
  } else if (S_ISDIR(st.st_mode)) {
    result.is_directory = true;
  }
  return result;
}

std::string Engine::LookupModule(const std::string& base_path, std::string module_name) {
  std::string full_path;
  if (module_name.rfind("./", 0) == 0 || module_name.rfind("../", 0) == 0) {
    // Relative path
    full_path = Basename(base_path) + "/" + module_name;
  } else if (module_name.rfind("/", 0) == 0) {
    // Absolute path
    full_path = module_name;
  } else {
    // Remove "node:" prefix if present
    if (module_name.find("node:") == 0) {
      module_name = module_name.substr(5);
    }
    // Node-style module, assume it's in /modules/
    full_path = "/modules/" + module_name;
  }

  // Normalize path (e.g., remove /./, resolve /../)
  // This is a simplified normalization. A full implementation would be more complex.
  size_t pos;
  while ((pos = full_path.find("/./")) != std::string::npos) {
    full_path.replace(pos, 3, "/");
  }
  while ((pos = full_path.find("/../")) != std::string::npos) {
    size_t prev_slash = full_path.rfind('/', pos - 1);
    if (prev_slash == std::string::npos) { // Should not happen for valid paths
      break;
    }
    full_path.erase(prev_slash, pos - prev_slash + 4);
  }

  StatResult fstat = StatPath(full_path);

  // Path found and is a file
  if (fstat.is_file) {
    return full_path;
  }

  // Try with '.js' extension
  if (!full_path.empty() && full_path.length() > 3 && full_path.substr(full_path.length() - 3) != ".js") {
    StatResult js_fstat = StatPath(full_path + ".js");
    if (js_fstat.is_file) {
      return full_path + ".js";
    }
  }

  // If it's a directory, try index.js
  if (fstat.is_directory) {
    StatResult index_js_fstat = StatPath(full_path + "/index.js");
    if (index_js_fstat.is_file) {
      return full_path + "/index.js";
    }
  }

  return ""; // Indicate not found
}

// JSModuleDef* Engine::ModuleLoader(JSContext* ctx, const char* module_name, void* opaque) {
//   std::string module_name_str(module_name);
//   std::string resolved_path = LookupModule("", module_name_str); // Base path is empty for top-level modules
//
//   if (resolved_path.empty()) {
//     JS_ThrowReferenceError(ctx, "Cannot find module '%s'", module_name);
//     return nullptr;
//   }
//
//   char* content = vfs_manager_->ReadVfsFile(resolved_path.c_str());
//   if (!content) {
//     JS_ThrowReferenceError(ctx, "Cannot read module file '%s'", resolved_path.c_str());
//     return nullptr;
//   }
//
//   JSValue func_val = JS_Eval(ctx, content, strlen(content), resolved_path.c_str(),
//                              JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
//   free(content);
//
//   if (JS_IsException(func_val)) {
//     return nullptr;
//   }
//
//   JSModuleDef* m = (JSModuleDef*)JS_VALUE_GET_PTR(func_val);
//   if (js_module_set_import_meta(ctx, func_val, false, false) < 0) {
//     JS_FreeValue(ctx, func_val);
//     return nullptr;
//   }
//   JS_FreeValue(ctx, func_val);
//
//   return m;
// }

// void Engine::RunSysFile(JSContext* ctx, const char* name) {
//   char* content = vfs_manager_->ReadVfsFile(name);
//   if (!content) {
//     JS_ThrowReferenceError(ctx, "Cannot read module file '%s'", name);
//     return ;
//   }
//
//   fprintf(stderr, "EVAL SIZE: %d\n", strlen(content));
//   JSValue func_val = JS_Eval(ctx, content, strlen(content), name, JS_EVAL_TYPE_GLOBAL);
//   free(content);
//
//   fprintf(stderr, "func_val : %lld\n", func_val);
//
//   if (JS_IsException(func_val)) {
//     js_std_dump_error(ctx_);
//   }
//
//   JS_FreeValue(ctx, func_val);
// }

int Engine::js_module_set_import_meta(
  JSContext *ctx, JSValueConst func_val,
  bool use_realpath, bool is_main
) {
  JSModuleDef *m;
  char buf[JS__PATH_MAX + 16];
  JSValue meta_obj;
  JSAtom module_name_atom;
  const char *module_name;

  assert(JS_VALUE_GET_TAG(func_val) == JS_TAG_MODULE);
  m = (JSModuleDef *) JS_VALUE_GET_PTR(func_val);

  module_name_atom = JS_GetModuleName(ctx, m);
  module_name = JS_AtomToCString(ctx, module_name_atom);
  JS_FreeAtom(ctx, module_name_atom);
  if (!module_name)
    return -1;
//   if (!strchr(module_name, ':')) {
//     strcpy(buf, "file://");
// #if !defined(_WIN32) && !defined(__wasi__)
//     /* realpath() cannot be used with modules compiled with qjsc
//        because the corresponding module source code is not
//        necessarily present */
//     if (use_realpath) {
//       char *res = realpath(module_name, buf + strlen(buf));
//       if (!res) {
//         JS_ThrowTypeError(ctx, "realpath failure");
//         JS_FreeCString(ctx, module_name);
//         return -1;
//       }
//     } else
// #endif
//     {
//       js__pstrcat(buf, sizeof(buf), module_name);
//     }
//   } else {
//     js__pstrcpy(buf, sizeof(buf), module_name);
//   }
  js__pstrcpy(buf, sizeof(buf), module_name);
  JS_FreeCString(ctx, module_name);

  meta_obj = JS_GetImportMeta(ctx, m);
  if (JS_IsException(meta_obj))
    return -1;
  JS_DefinePropertyValueStr(ctx, meta_obj, "url",
                            JS_NewString(ctx, buf),
                            JS_PROP_C_W_E);
  JS_DefinePropertyValueStr(ctx, meta_obj, "main",
                            JS_NewBool(ctx, is_main),
                            JS_PROP_C_W_E);
  JS_FreeValue(ctx, meta_obj);
  return 0;
}

void Engine::js_dump_obj(JSContext *ctx, FILE *f, JSValueConst val)
{
  const char *str;

  str = JS_ToCString(ctx, val);
  if (str) {
    fprintf(f, "%s\n", str);
    JS_FreeCString(ctx, str);
  } else {
    fprintf(f, "[exception]\n");
  }
}

void Engine::js_std_dump_error1(JSContext *ctx, JSValueConst exception_val)
{
  JSValue val;
  bool is_error;

  is_error = JS_IsError(exception_val);
  js_dump_obj(ctx, stderr, exception_val);
  if (is_error) {
    val = JS_GetPropertyStr(ctx, exception_val, "stack");
  } else {
    js_std_cmd(/*ErrorBackTrace*/2, ctx, &val);
  }
  if (!JS_IsUndefined(val)) {
    js_dump_obj(ctx, stderr, val);
    JS_FreeValue(ctx, val);
  }
}

void Engine::js_std_dump_error(JSContext *ctx) {
  JSValue exception_val = JS_GetException(ctx);
  js_std_dump_error1(ctx, exception_val);
  JS_FreeValue(ctx, exception_val);
}

JSValue Engine::LoadCjsModule(JSContext* ctx, const char* path, const char* content, bool standalone) {
  std::string real_path;

  size_t content_len = 0;

  if (content) {
    real_path = path;
    content_len = strlen(content);
  } else if (starts_with(path, "node:")) {
    real_path = "sysfs:///modules/";
    real_path.append(path + 5);
    real_path.append(".js");
  } else if (starts_with(path, "sysfs:///")) {
    real_path = path;
    if (!ends_with(real_path, ".js")) {
      real_path.append(".js");
    }
  } else {
    real_path = "sysfs:///modules/";
    real_path.append(path);
    real_path.append(".js");
  }

  fprintf(stderr, "LoadCjsModule: %s\n", real_path.c_str());

  if (loaded_modules_.count(real_path)) {
    return JS_DupValue(ctx, loaded_modules_[real_path]);
  }

  std::unique_ptr<FileBuffer> file_buffer;
  if (!content) {
    file_buffer = vfs_manager_->ReadVfsFile(real_path.c_str() + 9);
    if (!file_buffer) {
      return JS_ThrowReferenceError(ctx, "Cannot read module file '%s'", path);
    }
    content = (const char*)&file_buffer->data[0];
    content_len = file_buffer->data.size();
  }

  // Create a new module object
  JSValue module_obj = JS_NewObject(ctx);
  JSValue exports_obj = JS_NewObject(ctx);
  JS_SetPropertyStr(ctx, module_obj, "exports", JS_DupValue(ctx, exports_obj));

  // Prepare context for module evaluation
  JSValue global_obj = JS_GetGlobalObject(ctx);
  JSValue require_func = JS_GetPropertyStr(ctx, global_obj, "require");

  std::string dirname = Basename(path);

  // Module wrapper function (CommonJS style)
  std::string script_template;
  if (standalone) {
    script_template = "(function (exports, global, require, module, __filename, __dirname) { ";
  } else {
    script_template = "(function (exports, global, __orig_require, module, __filename, __dirname) { ";
    script_template += "const require = globalThis.__sys_wrapped_require(__orig_require, __filename); ";
  }
  script_template.append(content, content_len);
  script_template += "\n                                             })";

  JSValue module_func = JS_Eval(ctx, script_template.c_str(), script_template.length(),
                                path, JS_EVAL_FLAG_STRICT | JS_EVAL_TYPE_GLOBAL);

  if (JS_IsException(module_func)) {
    JS_FreeValue(ctx, exports_obj);
    JS_FreeValue(ctx, module_obj);
    return JS_EXCEPTION;
  }
  // Call the module function
  JSValueConst module_args[6] = {
    exports_obj,
    global_obj,
    require_func,
    module_obj,
    JS_NewString(ctx, real_path.c_str()),
    JS_NewString(ctx, dirname.c_str())
  };
  JSValue ret_val = JS_Call(ctx, module_func, JS_UNDEFINED, 6, module_args);

  JS_FreeValue(ctx, module_func);
  JS_FreeValue(ctx, global_obj);
  JS_FreeValue(ctx, require_func);
  JS_FreeValue(ctx, module_args[4]); // __filename
  JS_FreeValue(ctx, module_args[5]); // __dirname

  if (JS_IsException(ret_val)) {
    JS_FreeValue(ctx, exports_obj);
    JS_FreeValue(ctx, module_obj);
    return JS_EXCEPTION;
  }
  JS_FreeValue(ctx, ret_val);

  // Get the exports from the module object
  JSValue final_exports = JS_GetPropertyStr(ctx, module_obj, "exports");
  JS_FreeValue(ctx, module_obj);

  // Cache the module
  loaded_modules_[real_path] = final_exports;

  return JS_DupValue(ctx, final_exports);
}

JSValue Engine::JsConsoleLog(JSContext* ctx, JSValueConst this_val, int argc,
                             JSValueConst* argv) {
  for (int i = 0; i < argc; i++) {
    if (i > 0) {
      printf(" ");
    }

    const char* str = JS_ToCString(ctx, argv[i]);
    if (str) {
      printf("%s", str);
      JS_FreeCString(ctx, str);
    }
  }
  printf("\n");
  fflush(stdout);
  return JS_UNDEFINED;
}

JSValue Engine::JsRequire(JSContext* ctx, JSValueConst this_val, int argc,
                          JSValueConst* argv) {
  if (argc < 1) {
    return JS_ThrowTypeError(ctx, "require() expects module name");
  }

  const char* module_name = JS_ToCString(ctx, argv[0]);
  if (!module_name) {
    return JS_EXCEPTION;
  }

  JSValue m = LoadCjsModule(ctx, module_name, nullptr);
  JS_FreeCString(ctx, module_name);

  return m;
}

int Engine::LoopStep() {
  if (!ctx_ || !rt_) {
    return 0;
  }

  JSContext* ctx1;
  int err;
  int min_delay;

  // Promise microtask 처리 먼저
  for (;;) {
    err = JS_ExecutePendingJob(rt_, &ctx1);
    if (err <= 0) {
      if (err < 0) {
        JSValue exception = JS_GetException(ctx_);
        const char* error_str = JS_ToCString(ctx_, exception);
        fprintf(stderr, "Promise error: %s\n",
                error_str ? error_str : "Unknown error");
        JS_FreeCString(ctx_, error_str);
        JS_FreeValue(ctx_, exception);
        return -1;
      }
      break;
    }
  }

  // 타이머 처리
  if (timer_manager_->RunTimers(ctx_, &min_delay)) {
    return -1;
  }

  return (min_delay == 0 || JS_IsJobPending(rt_)) ? 1 : 0;
}

bool Engine::HasTimers() const {
  return timer_manager_ && timer_manager_->HasTimers();
}

bool Engine::HasPendingJobs() const {
  return rt_ && JS_IsJobPending(rt_);
}

char* Engine::Eval(const char* code) {
  if (!ctx_) {
    if (!Init()) {
      return strdup("Error: Failed to initialize QuickJS");
    }
  }

  JSValue result = JS_Eval(ctx_, code, strlen(code), "<eval>",
                           JS_EVAL_TYPE_GLOBAL);

  if (JS_IsException(result)) {
    js_std_dump_error(ctx_);
  }

  const char* result_str = JS_ToCString(ctx_, result);
  char* result_copy = strdup(result_str ? result_str : "undefined");
  JS_FreeCString(ctx_, result_str);
  JS_FreeValue(ctx_, result);

  return result_copy;
}

double Engine::Calculate(const char* expression) {
  if (!ctx_) {
    if (!Init()) {
      return 0.0;
    }
  }

  JSValue result = JS_Eval(ctx_, expression, strlen(expression), "<calc>",
                           JS_EVAL_TYPE_GLOBAL);

  if (JS_IsException(result)) {
    JS_FreeValue(ctx_, result);
    return 0.0;
  }

  double value = 0.0;
  if (JS_ToFloat64(ctx_, &value, result) < 0) {
    value = 0.0;
  }

  JS_FreeValue(ctx_, result);
  return value;
}

void Engine::FreeString(char* str) {
  if (str) {
    free(str);
  }
}

}  // namespace request_unraver