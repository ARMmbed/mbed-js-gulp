#include "jerryscript-mbed-event-loop/EventLoop.h"

namespace mbed {
namespace js {

EventLoop EventLoop::instance;

void event_loop() {
    EventLoop::getInstance().go();
}

}  // namespace js
}  // namespace mbed
