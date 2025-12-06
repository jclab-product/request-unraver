#include <emscripten/emscripten.h>

extern "C" {

  // milliseconds
  EM_IMPORT(_ru_get_now) double ru_get_now();

  // milliseconds
  EM_IMPORT(_ru_get_random) void ru_get_random(uint8_t* buf, int len);

}