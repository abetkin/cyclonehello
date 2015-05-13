

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

class MainHandler(cyclone.web.RequestHandler):
    def get(self):
        self.render('index.html')


clients = []

class Application(cyclone.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/eventsource", LiveHandler),
        ]

        settings = dict(
            xheaders=False,
            static_path="static",
            template_path="templates",
        )

        cyclone.web.Application.__init__(self, handlers, **settings)


class LiveHandler(cyclone.sse.SSEHandler):
    def bind(self):
        clients.append(self)

    def unbind(self):
        clients.remove(self)


class Mona(Monast):

    def _updateQueue(self, servername, **kw):
        super(Mona, self)._updateQueue(servername, **kw)
        server = self.servers.get(servername)
        queuename = kw.get('queue')
        queue = server.status.queues.get(queuename)
        q_info = json.dumps(queue.__dict__)
        event = kw.get('event')
        
        for client in clients:
            client.sendEvent("""\
event => %(event)s, ___queue => %(q_info)s""" % locals())
            
if __name__ == '__main__':
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)