

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

        info = QueueInfo(self)
        try:
            chan = info.channels.values()[-1]
        except IndexError:
            return

        
        for client in clients:
            client.sendEvent("""\
chan => %s""" % chan.__dict__)




class QueueInfo(object):

    SERVER = 'Main'
    FIELDS = [
        'onhold_max', 'num_calls',
    ]

    '''calleridname
    starttime'''

    def __init__(self, monast, queuename):
        self.server = monast.servers.get(self.SERVER)
        self.clients = self.server.status.queueClients
        self.channels = self.server.status.channels
        self.queue = self.server.status.queues.values()[0]

    def jsonify(self, ):
        dic = dict((field, getattr(self, field)) for field in self.FIELDS)
        return json.dumps(dic)


    @property
    def onhold_max(self, ):
        return 2

    @property
    def num_calls(self):
        return 1



if __name__ == '__main__':
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)