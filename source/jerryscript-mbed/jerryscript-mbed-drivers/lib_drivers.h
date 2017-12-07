#ifndef _JERRYSCRIPT_MBED_DRIVERS_LIB_DRIVERS_H
#define _JERRYSCRIPT_MBED_DRIVERS_LIB_DRIVERS_H

#include "jerryscript-ext/handler.h"
#include "jerryscript-mbed-drivers/InterruptIn-js.h"
#include "jerryscript-mbed-drivers/DigitalOut-js.h"
#include "jerryscript-mbed-drivers/setInterval-js.h"
#include "jerryscript-mbed-drivers/setTimeout-js.h"
#include "jerryscript-mbed-drivers/I2C-js.h"
#include "jerryscript-mbed-drivers/AnalogIn-js.h"
#include "jerryscript-mbed-drivers/PwmOut-js.h"

DECLARE_JS_WRAPPER_REGISTRATION (base) {
    REGISTER_GLOBAL_FUNCTION_WITH_HANDLER(assert, jerryx_handler_assert);
    REGISTER_GLOBAL_FUNCTION_WITH_HANDLER(gc, jerryx_handler_gc);
    REGISTER_GLOBAL_FUNCTION_WITH_HANDLER(print, jerryx_handler_print);
    REGISTER_GLOBAL_FUNCTION(setInterval);
    REGISTER_GLOBAL_FUNCTION(setTimeout);
    REGISTER_GLOBAL_FUNCTION(clearInterval);
    REGISTER_GLOBAL_FUNCTION(clearTimeout);
    REGISTER_CLASS_CONSTRUCTOR(DigitalOut);
    REGISTER_CLASS_CONSTRUCTOR(I2C);
    REGISTER_CLASS_CONSTRUCTOR(InterruptIn);
    REGISTER_CLASS_CONSTRUCTOR(AnalogIn);
    REGISTER_CLASS_CONSTRUCTOR(PwmOut);
}

#endif  // _JERRYSCRIPT_MBED_DRIVERS_LIB_DRIVERS_H
