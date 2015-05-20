

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

import ipdb

SERVER = 'Main'

class MainHandler(cyclone.web.RequestHandler):

    def get(self):
        # with ipdb.launch_ipdb_on_exception():
        Queue.ensure_instances()

        def queues():
            for queue in Queue.instances.values():
                yield queue.name, {
                    'q_name': queue.name,
                    'time_waiting': queue.time_waiting,
                    'count': queue.count,
                }
        queues_json = json.dumps(dict(queues()))
        self.render('index.html', queues_json=queues_json)


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

    instance = None

    def __init__(self, *args, **kw):
        self.__class__.instance = self
        super(Mona, self).__init__(*args, **kw)

    http_clients = []

    def sendEvent(self, event):
        for http_client in self.http_clients:
            http_client.sendEvent(event)

    def _updateQueue(self, servername, **kw):
        super(Mona, self)._updateQueue(servername, **kw)
        # with ipdb.launch_ipdb_on_exception():
        # Queue.update() # instance
        Queue.ensure_instances()
        for queue in Queue.instances.values():
            queue.do_update()


import time

from itertools import groupby

class Queue(object):
    SERVER = 'Main'
    
    instances = None # {queue name: queue}

    longest_waiting = None
    count = 0

    @classmethod
    def ensure_instances(cls):
        if cls.instances is not None:
            return
        server = Mona.instance.servers.get(cls.SERVER)
        cls.instances = dict((q_name, cls(q_name))
                             for q_name in server.status.queues
                             if q_name != 'default')

    def __init__(self, q_name):
        self.name = self.q_name = q_name
        self.server = Mona.instance.servers.get(self.SERVER)
        self.do_update(send_event=False)

    def do_update(self, send_event=True):
        # ipd
        count = 0
        time_joined = None
        longest_waiting = None
        clients = self.server.status.queueClients
        for (q_name, iden), client in clients.items():
            if (self.name == q_name):
                count += 1
                if time_joined is None or client.jointime < time_joined:
                    time_joined = client.jointime
                    longest_waiting = (q_name, iden)
        send_event = send_event and (count != self.count)
        self.count = count
        if longest_waiting == self.longest_waiting or time_joined is None:
            self.time_waiting = None
        else:
            self.longest_waiting = longest_waiting
            self.time_waiting = int(time.time() - time_joined)
        if send_event:
            event = {
                'time_waiting': self.time_waiting,
                'q_name': self.name,
                'count': self.count,
            }
            Mona.instance.sendEvent(json.dumps(event))


if __name__ == '__main__':
    # ipdb.set_trace()
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)