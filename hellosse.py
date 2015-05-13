import sys

import cyclone.sse
import cyclone.web

from twisted.internet import reactor

clients = []

class Application(cyclone.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/eventsource", LiveHandler),
        ]
        settings = dict(
            debug=True,
            static_path="static",
            template_path="templates",
        )
        cyclone.web.Application.__init__(self, handlers, **settings)


class MainHandler(cyclone.web.RequestHandler):
    def get(self):
        self.render('index.html')

class LiveHandler(cyclone.sse.SSEHandler):
    def bind(self):
        clients.append(self)

    def unbind(self):
        clients.remove(self)


import itertools
_count = itertools.count()

def main():
    from twisted.internet import task
    
    def mytask():
        for client in clients:
            client.sendEvent('Hola mundo %d' % next(_count))
    
    l = task.LoopingCall(mytask)
    l.start(3.0) # call every second

    reactor.listenTCP(8890, Application(), interface="0.0.0.0")
    reactor.run()


if __name__ == "__main__":
    main()