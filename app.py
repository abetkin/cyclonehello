

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

import ipdb

SERVER = 'Main'

class MainHandler(cyclone.web.RequestHandler):

    1

    def get(self):
        # with ipdb.launch_ipdb_on_exception():
        Queue.ensure_instances()

        def queues():
            for queue in Queue.instances.values():
                # queue.__dict__.update(queue.get_state())
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
        Queue.update() # instance


import time

class EventType:
    time_waiting = 'time_waiting'
    count = 'count'


from itertools import groupby

class Queue(object):
    SERVER = 'Main'
    
    instances = None # {queue name: queue}

    CHANGES = [
        'time', 'count'
    ]

    longest_waiting = None
    count = 0

    @classmethod
    def ensure_instances(cls):
        if cls.instances is not None:
            return
        server = Mona.instance.servers.get(cls.SERVER)
        cls.instances = {q_name: cls(q_name) for q_name in server.status.queues}
        cls.old_clients = set(server.status.queueClients)

    def __init__(self, q_name):
        self.name = self.q_name = q_name
        self.server = Mona.instance.servers.get(self.SERVER)
        self.__dict__.update(self.get_state())
        

    # TODO logging

    def get_state(self):
        count = 0
        value = None
        longest_waiting = None
        clients = self.server.status.queueClients
        for (q_name, iden), client in clients.items():
            if (self.name == q_name):
                count += 1
                if value is None or client.jointime < value:
                    value = client.jointime
                    longest_waiting = (q_name, iden)
        if value is not None:
            value = int(time.time() - value)
        print 'value>', value
        return {
            'time_waiting': value,
            'longest_waiting': longest_waiting,
            'count': count,
        }

    def handle_event(self, connected, disconnected):
        if self.longest_waiting is None or \
                (disconnected and disconnected == self.longest_waiting):
           self.__dict__.update(self.get_state())
        # delta = int(bool(connected)) - int(bool(disconnected))
        # get count
        # remove ipdb
        self.count = len(list(_ for name, _ in self.server.status.queueClients
                              if name == self.name))
        event = {
            'time_waiting': self.time_waiting,
            'count': self.count,
            'q_name': self.name,
        }
        Mona.instance.sendEvent(json.dumps(event))

    @classmethod
    def update(cls):
        cls.ensure_instances()
        connected = cls.get_connected_client()
        disconnected = cls.get_disconnected_client()
        assert abs(bool(connected)) + abs(bool(disconnected)) < 2, \
                "Should be just 1 event at a time"
        if not (connected or disconnected):
            return
        # ipdb.set_trace()
        queue_name, _ = connected or disconnected
        queue = Queue.instances.get(queue_name)
        if queue is None:
            assert connected
            queue = Queue.instances.setdefault(queue_name,
                                               Queue(queue_name, [connected]))
        queue.handle_event(connected, disconnected)
        server = Mona.instance.servers.get(cls.SERVER)
        cls.old_clients = set(server.status.queueClients)


    @classmethod
    def get_connected_client(cls):
        server = Mona.instance.servers.get(cls.SERVER)
        dif = set(server.status.queueClients.keys()) - cls.old_clients
        if dif:
            client, = dif
            return client

    @classmethod
    def get_disconnected_client(cls):
        server = Mona.instance.servers.get(cls.SERVER)
        dif = cls.old_clients.difference(server.status.queueClients)
        if dif:
            client, = dif
            return client

    


if __name__ == '__main__':
    # ipdb.set_trace()
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)