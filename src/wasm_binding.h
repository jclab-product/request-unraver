#include <emscripten/emscripten.h>

extern "C" {

  // milliseconds
  EM_IMPORT(_ru_get_now) double ru_get_now();

}