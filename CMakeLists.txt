cmake_minimum_required(VERSION 3.16)
project(request-unraver C CXX)

set(CMAKE_SKIP_RPATH TRUE)
set(CMAKE_INSTALL_RPATH "")
set(ZLIB_BUILD_STATIC ON  CACHE BOOL "" FORCE)
set(ZLIB_BUILD_SHARED OFF CACHE BOOL "" FORCE)

# 디렉토리 설정
set(QUICKJS_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/quickjs-ng)
set(LIBSQUASH_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/libsquash)
set(ZLIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/zlib)
set(MSGPACK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/third_party/msgpack)
set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
set(BUILD_DIR ${CMAKE_CURRENT_BINARY_DIR}/build)
set(DIST_DIR ${CMAKE_CURRENT_BINARY_DIR}/dist)
set(SCRIPTS_DIR ${CMAKE_CURRENT_SOURCE_DIR}/scripts)

# 빌드 및 배포 디렉토리 생성
file(MAKE_DIRECTORY ${BUILD_DIR})
file(MAKE_DIRECTORY ${DIST_DIR})

# 서브모듈 초기화 자동화 (third_party/quickjs-ng/quickjs.c 파일 존재 여부로 판단)
if(NOT EXISTS "${QUICKJS_DIR}/quickjs.c")
    message(STATUS "Submodules not initialized. Running git submodule update --init --recursive...")
    execute_process(
        COMMAND git submodule update --init --recursive
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        RESULT_VARIABLE GIT_RESULT
    )
    if(NOT GIT_RESULT EQUAL 0)
        message(FATAL_ERROR "Failed to initialize submodules. Please run 'git submodule update --init --recursive' manually.")
    endif()
    message(STATUS "Submodules initialized successfully.")
endif()

set(CMAKE_POLICY_VERSION_MINIMUM 3.5)

# Emscripten 툴체인 설정
if(NOT CMAKE_TOOLCHAIN_FILE)
    # EMSDK 환경 변수 확인 및 HINTS 설정
    if(DEFINED ENV{EMSDK})
        set(EMSDK_PATH "$ENV{EMSDK}")
        set(EMSDK_HINT "${EMSDK_PATH}/upstream/emscripten")
        message(STATUS "EMSDK environment found: ${EMSDK_PATH}")
    else()
        set(EMSDK_HINT "")
    endif()

    find_program(EMCC NAMES emcc HINTS ${EMSDK_HINT})
    message(STATUS "EMCC : ${EMCC} | ${EMSDK_HINT}")
    if(EMCC)
        get_filename_component(EMCC_BIN_DIR ${EMCC} DIRECTORY)

        execute_process(COMMAND realpath ${EMCC} OUTPUT_VARIABLE EMCC_REALPATH)
        string(STRIP ${EMCC_REALPATH} EMCC_REALPATH)
        get_filename_component(EMSCRIPTEN_ROOT ${EMCC_REALPATH} DIRECTORY)

        message(STATUS "EMSCRIPTEN_ROOT : ${EMSCRIPTEN_ROOT}")

        set(EMSCRIPTEN_TOOLCHAIN_FILE "${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake")
        message(STATUS "Emscripten toolchain file set to: ${EMSCRIPTEN_TOOLCHAIN_FILE}")

        if (CMAKE_HOST_WIN32)
            set(EMCC_SUFFIX ".bat")
        else()
            set(EMCC_SUFFIX "")
        endif()

        # Specify the compilers to use for C and C++
        set(CMAKE_C_COMPILER "${EMCC_BIN_DIR}/emcc${EMCC_SUFFIX}" CACHE FILEPATH "Emscripten emcc" FORCE)
        set(CMAKE_CXX_COMPILER "${EMCC_BIN_DIR}/em++${EMCC_SUFFIX}" CACHE FILEPATH "Emscripten em++" FORCE)
        include(${EMSCRIPTEN_TOOLCHAIN_FILE})
    else()
        message(FATAL_ERROR "Emscripten compiler (emcc) not found. Please install Emscripten and ensure 'emcc' is in your PATH, or set CMAKE_TOOLCHAIN_FILE manually.")
    endif()
endif()

message(STATUS "CMAKE_SYSTEM_NAME:  ${CMAKE_SYSTEM_NAME}")
message(STATUS "CMAKE_C_COMPILER:   ${CMAKE_C_COMPILER}")
message(STATUS "CMAKE_CXX_COMPILER: ${CMAKE_CXX_COMPILER}")

# THIRD_PARTY: zlib
add_subdirectory(${ZLIB_DIR} ${BUILD_DIR}/zlib)

# ZLIB 변수 수동 설정 (libsquash의 FIND_PACKAGE(ZLIB) 호환)
set(ZLIB_INCLUDE_DIR ${ZLIB_DIR})
set(ZLIB_LIBRARIES "")

# THIRD_PARTY: libsquash
add_subdirectory(${LIBSQUASH_DIR} ${BUILD_DIR}/libsquash)

target_compile_definitions(squash PRIVATE __linux__)
target_compile_options(squash PRIVATE -I${CMAKE_CURRENT_SOURCE_DIR}/include)

# THIRD_PARTY: quickjs
add_subdirectory(${QUICKJS_DIR} ${BUILD_DIR}/quickjs-ng)

# THIRD_PARTY: msgpack
SET (MSGPACK_USE_BOOST  OFF CACHE BOOLEAN "Use Boost libraried" FORCE)
SET (MSGPACK_BUILD_DOCS OFF CACHE BOOLEAN "Build Doxygen documentation" FORCE)
add_subdirectory(${MSGPACK_DIR} ${BUILD_DIR}/msgpack)

# THIRD_PARTY: libsquash
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/third_party/jclab-license-v2 ${BUILD_DIR}/jclab-license-v2)

# 메인 소스 파일
set(MAIN_SOURCES
        ${SRC_DIR}/wasm_binding.cc
        ${SRC_DIR}/wasm_binding.h
        ${SRC_DIR}/engine.cc
        ${SRC_DIR}/timer_manager.cc
        ${SRC_DIR}/vfs_manager.cc
        ${SRC_DIR}/util.cc
        ${SRC_DIR}/util.h
        ${SRC_DIR}/vfd.cc
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/walink/cpp/src/walink.cc
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/walink/cpp/include/walink.h
 )
 
 # wasm binding source
 list(APPEND REQUEST_UNRAVER_SOURCES
   ${CMAKE_CURRENT_SOURCE_DIR}/src/wasm_binding.cc
 )
set(STATIC_VFS_DATA_SOURCE ${CMAKE_CURRENT_BINARY_DIR}/static_vfs_data.cc)
set(STATIC_VFS_DATA_HEADER ${CMAKE_CURRENT_BINARY_DIR}/static_vfs_data.h)


file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/sysfs)

FILE(GLOB_RECURSE PSEUDO_BROWSER_SRC_FILES ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/src/*.js)
message("PSEUDO_BROWSER_SRC_FILES : ${PSEUDO_BROWSER_SRC_FILES}")
add_custom_command(
        OUTPUT
            ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/dist/pseudo-browser-full.js
            ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/dist/pseudo-browser-mini.js
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/node
        COMMAND ${SCRIPTS_DIR}/build-pseudo-browser.sh pseudo-browser
        DEPENDS
            ${SCRIPTS_DIR}/build-pseudo-browser.sh
            ${CMAKE_CURRENT_SOURCE_DIR}/node/pnpm-lock.yaml
            ${PSEUDO_BROWSER_SRC_FILES}
        COMMENT "Building pseudo-browser"
)

# static_vfs_data 생성 (pseudo-browser 빌드 및 pack-static-vfs 스크립트 실행)
add_custom_command(
    OUTPUT
        ${CMAKE_CURRENT_BINARY_DIR}/sysfs/pseudo-browser-full.js
        ${CMAKE_CURRENT_BINARY_DIR}/sysfs/pseudo-browser-mini.js
        ${STATIC_VFS_DATA_SOURCE} ${STATIC_VFS_DATA_HEADER}
    COMMAND rm -rf ${CMAKE_CURRENT_BINARY_DIR}/sysfs/
    COMMAND cp -rf ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/dist ${CMAKE_CURRENT_BINARY_DIR}/sysfs
    COMMAND cp -rf ${CMAKE_CURRENT_SOURCE_DIR}/src/init.js ${CMAKE_CURRENT_BINARY_DIR}/sysfs/init.js
    COMMAND ${SCRIPTS_DIR}/pack-static-vfs.sh "${CMAKE_CURRENT_BINARY_DIR}/sysfs" "${CMAKE_CURRENT_BINARY_DIR}/sysfs.sqfs" "static_vfs_data" "static_vfs"
    DEPENDS
        ${CMAKE_CURRENT_SOURCE_DIR}/src/init.js
        ${SCRIPTS_DIR}/pack-static-vfs.sh
        ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/dist/pseudo-browser-full.js
        ${CMAKE_CURRENT_SOURCE_DIR}/node/pseudo-browser/dist/pseudo-browser-mini.js
    COMMENT "Packing static vfs to SquashFS..."
)
add_library(static_vfs_data STATIC ${STATIC_VFS_DATA_SOURCE} ${STATIC_VFS_DATA_HEADER})

# 메인 실행 파일 (WASM 모듈)
add_executable(request-unraver-wasm ${MAIN_SOURCES})
target_link_libraries(request-unraver-wasm PRIVATE static_vfs_data qjs zlibstatic squash msgpack-cxx jclab_license mbedtls)
target_compile_definitions(request-unraver-wasm PRIVATE CONFIG_VERSION="ng")
target_include_directories(request-unraver-wasm PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_BINARY_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${SRC_DIR}
    ${LIBSQUASH_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/walink/cpp/include
)
target_link_options(request-unraver-wasm PRIVATE
        -O3
        -sWASM=1
        -sWASM_BIGINT=1
        -sSTANDALONE_WASM=1
        -sEXPORTED_FUNCTIONS=['_walink_alloc','_walink_free','_engine_new','_engine_cleanup','_engine_has_timers','_engine_has_pending_jobs','_engine_js_eval','_engine_browser_eval','_malloc','_free']
        -sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8','lengthBytesUTF8']
        -sERROR_ON_UNDEFINED_SYMBOLS=0
        -sALLOW_MEMORY_GROWTH=1
        -sMODULARIZE=1
        -sEXPORT_NAME='createQuickJSModule'
#        -sINITIAL_MEMORY=33554432
#        -sINITIAL_MEMORY=67108864
        -sINITIAL_MEMORY=134217728
        -sSTACK_SIZE=8388608
#        -sSTACK_SIZE=16777216
        -sASSERTIONS=2
        --no-entry
)
set_target_properties(request-unraver-wasm PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${DIST_DIR}
    OUTPUT_NAME request-unraver-wasm
)

## WASM 빌드 후 파일 이름 변경 및 Node.js unit test 자동 실행 (emscripten은 .js와 .wasm을 함께 생성)
#add_custom_command(TARGET request-unraver-wasm POST_BUILD
#    COMMAND ${CMAKE_COMMAND} -E echo "WASM build completed: ${DIST_DIR}/request-unraver-wasm.js and ${DIST_DIR}/request-unraver-wasm.wasm"
#    COMMAND ${CMAKE_COMMAND} -E echo "Running Node.js unit tests..."
#    COMMAND node --no-experimental-fetch ${CMAKE_CURRENT_SOURCE_DIR}/test/node-require.test.js
#    COMMENT "Running Node.js unit tests after WASM build..."
#)
#
## CMake 타겟에 대한 별칭 (Makefile의 'wasm' 타겟과 유사, test 자동 실행 포함)
#add_custom_target(wasm ALL DEPENDS request-unraver-wasm)
