/*
 * QuickJS WASM API - C++ Implementation
 * Based on quickjs-libc.c timer and event loop implementation
 * With libsquash VFS for Node.js module support
 */

#include <emscripten/emscripten.h>

#include "engine.h"

extern "C" {

  #define EXPORT EMSCRIPTEN_KEEPALIVE

// QuickJS 초기화
EXPORT int js_init() {
  return request_unraver::Engine::GetInstance()->Init();
}

// QuickJS 정리
EXPORT void js_cleanup() {
  request_unraver::Engine::CleanupInstance();
}

// 이벤트 루프 실행 (한 번 실행)
EXPORT int js_loop_step() {
  return request_unraver::Engine::GetInstance()->LoopStep();
}

// 활성 타이머가 있는지 확인
EXPORT int js_has_timers() {
  return request_unraver::Engine::GetInstance()->HasTimers();
}

// 대기 중인 작업이 있는지 확인
EXPORT int js_has_pending_jobs() {
  return request_unraver::Engine::GetInstance()->HasPendingJobs();
}

// JavaScript 코드 실행
EXPORT char* js_eval(const char* code) {
  return request_unraver::Engine::GetInstance()->Eval(code);
}

// 간단한 덧셈 API
EXPORT int add(int a, int b) {
  return a + b;
}

// 간단한 곱셈 API
EXPORT int multiply(int a, int b) {
  return a * b;
}

// JavaScript 표현식 계산
EXPORT double js_calculate(const char* expression) {
  return request_unraver::Engine::GetInstance()->Calculate(expression);
}

// 메모리 해제 함수
EXPORT void js_free_string(char* str) {
  request_unraver::Engine::FreeString(str);
}

}  // extern "C"