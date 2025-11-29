#!/usr/bin/env node --no-experimental-fetch
/**
 * Node.js unit test for QuickJS WASM require() system
 * Usage: node --no-experimental-fetch test/node-require.test.js
 */

const fs = require('fs');
const path = require('path');

// WASM 모듈 로드
async function loadWasm() {
    const createModule = require('../cmake-build-debug/dist/quickjs-api');
    return await createModule();
}

// 테스트 결과 수집
const testResults = [];

function test(name, fn) {
    try {
        fn();
        testResults.push({ name, status: 'PASS' });
        console.log(`✓ ${name}`);
    } catch (error) {
        testResults.push({ name, status: 'FAIL', error: error.message });
        console.log(`✗ ${name}: ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// WASM에서 코드 실행 헬퍼
function evalInWasm(Module, code) {
    console.log('prepare')
    const evalFunc = Module.cwrap('js_eval', 'number', ['string']);
    console.log('run')
    const resultPtr = evalFunc(code);
    console.error('resultPtr : ', resultPtr);
    const result = Module.UTF8ToString(resultPtr);
    
    const freeFunc = Module.cwrap('js_free_string', null, ['number']);
    freeFunc(resultPtr);
    
    // 이벤트 루프 실행
    const loopStep = Module.cwrap('js_loop_step', 'number', []);
    const hasTimers = Module.cwrap('js_has_timers', 'number', []);
    const hasPendingJobs = Module.cwrap('js_has_pending_jobs', 'number', []);
    
    while (hasTimers() || hasPendingJobs()) {
        loopStep();
    }
    
    return result;
}

// 메인 테스트 함수
async function runTests() {
    console.log('='.repeat(60));
    console.log('Node.js require() System Tests (via WASM)');
    console.log('='.repeat(60));
    console.log('');
    
    console.log('📦 Loading WASM module...');
    const Module = await loadWasm();
    
    const jsInit = Module.cwrap('js_init', 'number', []);
    const initResult = jsInit();
    
    if (!initResult) {
        console.error('❌ QuickJS 초기화 실패');
        process.exit(1);
    }
    
    console.log('✓ WASM module loaded:', initResult);
    console.log('');

    // 1. window 확인
    test('has window', () => {
        const code = `console.log(typeof window);`;
        const result = evalInWasm(Module, code);
        console.log('result : ', result);
        // assertEqual(result, 'function,function,function', 'path module functions should be available');
    });

    // 결과 요약
    console.log('');
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const totalCount = testResults.length;
    
    console.log(`Total: ${totalCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (failCount > 0) {
        console.log('');
        console.log('Failed tests:');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('');
    if (passCount === totalCount) {
        console.log('✅ All tests passed!');
        process.exit(1);
    } else {
        console.log('❌ Some tests failed');
        process.exit(1);
    }
}

// 테스트 실행
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});