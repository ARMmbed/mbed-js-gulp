#ifndef _JERRYSCRIPT_MBED_UTIL_LOGGING_H
#define _JERRYSCRIPT_MBED_UTIL_LOGGING_H

#include "mbed.h"

#ifdef DEBUG_WRAPPER
#define LOG_PRINT(...) printf(__VA_ARGS__)
#else
#define LOG_PRINT(...) while(0) { }
#endif

#define LOG_PRINT_ALWAYS(...) printf(__VA_ARGS__)

#endif  // _JERRYSCRIPT_MBED_UTIL_LOGGING_H
