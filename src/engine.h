#ifndef REQUEST_UNRAVER_ENGINE_H_
#define REQUEST_UNRAVER_ENGINE_H_

#include <cstdint>
#include <memory>
#include <map>

#include <emscripten.h>

extern "C" {
#include <quickjs.h>
}

#include "timer_manager.h"
#include "vfs_manager.h"

namespace request_unraver {

#define ENGINE_MODE_MINI 14587050
#define ENGINE_MODE_FULL 22448265

class Engine {
 public:
  bool Init(uint32_t mode, std::shared_ptr<VfsManager> vfs_manager);
  void Shutdown();

  // 이벤트 루프
  int LoopStep();

  // 상태 확인
  bool HasTimers() const;
  bool HasPendingJobs() const;

  // JS 실행
  void Eval(const char* code);

  // 접근자 (내부용)
  JSRuntime* runtime() const { return rt_; }
  JSContext* context() const { return ctx_; }
  TimerManager* timer_manager() const { return timer_manager_.get(); }
  VfsManager* vfs_manager() const { return vfs_manager_.get(); }

  Engine();
  ~Engine();

  bool InitializeRuntime();
  void RegisterGlobals();

  JSValue JsConsoleLog(JSContext* ctx, JSValueConst this_val, int argc,
                       JSValueConst* argv);
  JSValue JsRequire(JSContext* ctx, JSValueConst this_val, int argc,
                    JSValueConst* argv);
  // JSModuleDef* ModuleLoader(JSContext* ctx, const char* module_name, void* opaque);
  // void RunSysFile(JSContext* ctx, const char* name);

  void js_dump_obj(JSContext *ctx, FILE *f, JSValueConst val);
  void js_std_dump_error1(JSContext *ctx, JSValueConst exception_val);
  void js_std_dump_error(JSContext *ctx);

  static std::string js_to_string(JSContext* ctx, JSValueConst v);
  static std::string js_error_to_string(JSContext *ctx, JSValueConst exception_val);

  JSValue CreateWindow(const char* content, const uint8_t *windowOptions_msgp, int windowOptions_len);

 private:
  // 헬퍼 함수들
  std::string Basename(const std::string& path);
  struct StatResult {
    int error_code;
    bool is_file;
    bool is_directory;
  };
  StatResult StatPath(const std::string& path);
  std::string LookupModule(const std::string& base_path, std::string module_name);
  JSValue LoadCjsModule(JSContext* ctx, const char* path, const char* content, bool standalone = false);
  int js_module_set_import_meta(
    JSContext *ctx, JSValueConst func_val,
    bool use_realpath, bool is_main
  );

  std::map<std::string, JSValue> loaded_modules_;

private:

 JSRuntime* rt_;
 JSContext* ctx_;
 std::unique_ptr<TimerManager> timer_manager_;
 std::shared_ptr<VfsManager> vfs_manager_;
};

}  // namespace request_unraver

#endif  // REQUEST_UNRAVER_ENGINE_H_