

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
        with ipdb.launch_ipdb_on_exception():
            Queue.ensure_instances()

            def queues():
                for queue in Queue.instances.values():
                    queue.longest_waiting, time_waiting = queue.get_time_waiting()
                    yield {
                        'q_name': queue.name,
                        'time_waiting': time_waiting,
                        'count': queue.count,
                    }
            self.render('index.html', queues=list(queues()))


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
        with ipdb.launch_ipdb_on_exception():
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
        monast = Mona.instance
        server = monast.servers.get(cls.SERVER)
        all_clients = server.status.queueClients
        cls.old_clients = set(all_clients)
        cls.instances = {}
        for q_name, clients in groupby(all_clients, key=lambda k: k[0]):
            cls.instances[q_name] = Queue(q_name, set(clients))

    def __init__(self, q_name, clients):
        self.name = self.q_name = q_name
        self.count = len(clients)
        self.server = Mona.instance.servers.get(self.SERVER)
        

    # TODO logging

    def get_time_waiting(self):
        value = None
        clients = self.server.status.queueClients
        for (q_name, iden), client in clients.items():
            if (self.name == q_name) and client.seconds > value:
                value = client.seconds
                winner = (q_name, iden)
        if value:
            value = int(time.time() - clients[winner].jointime)
            return winner, value

    def handle_event(self, connected, disconnected):
        time_waiting = None
        if disconnected and disconnected == self.longest_waiting:
           self.longest_waiting, time_waiting = self.get_time_waiting()
        delta = int(bool(connected)) - int(bool(disconnected))
        self.count += delta
        if time_waiting or delta:
            event = {
                'time_waiting': time_waiting,
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

    '''
    @classmethod
    def update(cls):
        event_type = None
        connected = cls.get_connected_client()
        disconnected = cls.get_disconnected_client()
        assert abs(bool(connected)) + abs(bool(disconnected)) < 2, \
                "Should be just 1 event at a time"

        time_waiting = None
        if disconnected and disconnected == cls.longest_waiting:
            event_type = EventType.time_waiting
            queue_name, _ = disconnected
            queue = Queue.instances[queue_name]
            time_waiting = queue._get_time_waiting()

        delta = int(bool(connected)) - int(bool(disconnected))

        if delta:
            queue_name, _ = connected or disconnected
            event_type = event_type or EventType.count
        cls.count += delta # FIX
        event = dict(
            queue_name = queue_name,
            time_waiting = time_waiting,
            count = cls.count,
        )
        Mona.instance.sendEvent(json.dumps(event))
        server = Mona.instance.servers.get(cls.SERVER)
        cls.old_clients = set(server.status.queueClients)
    '''
    
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