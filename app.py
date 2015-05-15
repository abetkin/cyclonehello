

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

import ipdb


class MainHandler(cyclone.web.RequestHandler):
    def get(self):
        self.render('index.html')


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
        Mona.http_clients.append(self)

    def unbind(self):
        Mona.http_clients.remove(self)


class Mona(Monast):

    http_clients = []

    def sendEvent(self, event):
        for http_client in self.http_clients:
            http_client.sendEvent(event)

    def _updateQueue(self, servername, **kw):
        super(Mona, self)._updateQueue(servername, **kw)
        with ipdb.launch_ipdb_on_exception():
            Queue.create_instances(self)
            Queue.update_all()



class Queue(object):
    
    SERVER = 'Main'
    
    instances = {}
    
    longest_waiting = None
    count = 0

    @classmethod
    def create_instances(cls, monast):
        server = monast.servers.get(cls.SERVER)
        for q_name, iden in server.status.queueClients:
            if q_name not in cls.instances:
                cls.instances[q_name] = Queue(monast, q_name)

    def __init__(self, monast, q_name):
        self.q_name = q_name
        self.monast = monast
        self.server = monast.servers.get(self.SERVER)

    def get_clients(self):
        for q_name, iden in self.server.status.queueClients:
            if q_name == self.q_name:
                yield (q_name, iden)
    
    def update(self):
        needs_update = False
        clients = list(self.get_clients())
        if not clients:
            if self.longest_waiting is not None:
                self.longest_waiting = None
                needs_update = True
        elif self.longest_waiting not in self.server.status.queueClients:
            needs_update = True
            self.longest_waiting = max(
                clients,
                key=lambda k: self.server.status.queueClients[k].seconds)
        if len(clients) != self.count:
            needs_update = True
            self.count = len(clients)
        if needs_update:
            if self.longest_waiting is None:
                time = '-'
            else:
                time = self.server.status.queueClients[self.longest_waiting].seconds
            event = dict(
                queue_name = self.q_name,
                time_waiting = time,
                count = self.count,
            )
            self.monast.sendEvent(json.dumps(event))
    
    @classmethod
    def update_all(cls):
        for qu in cls.instances.values():
            qu.update()


if __name__ == '__main__':
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)