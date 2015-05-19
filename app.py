

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
        Queue._create_instances(Mona.instance)

        queues = [{
            'q_name': q_name,
            'waiting_time': queue._get_time_waiting(),
            'count': len(queue.clients)
            } for q_name, queue in Queue.instances.items()
        ]
        self.render('index.html', queues=queues)


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
        super(Mona, self).__init__(*args, **kw)
        self.instance = self

    http_clients = []

    def sendEvent(self, event):
        for http_client in self.http_clients:
            http_client.sendEvent(event)

    def _updateQueue(self, servername, **kw):
        super(Mona, self)._updateQueue(servername, **kw)
        Queue.create_instances(self)
        Queue.update_all()


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

    queue_clients = None

    # if not queue_clients:
    # queue_clients = dict(self.server.status.queueClients)

    @classmethod
    def _create_instances(cls, monast):
        server = monast.servers.get(cls.SERVER)
        all_clients = server.status.queueClients
        for q_name, clients in groupby(all_clients, key=lambda k: k[0]):
            cls.instances[q_name] = Queue(q_name, set(clients))

            
    # FIXME count

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
                winner = client
        if value:
            value = int(time.time() - clients[winner].jointime)
            return winner, value

    # def check_waiting_time(self):
    #     1
    #
    # def check_count(self):
    #     1

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
        connected = cls.get_connected_client()
        disconnected = cls.get_disconnected_client()
        assert abs(bool(connected)) + abs(bool(disconnected)) < 2, \
                "Should be just 1 event at a time"
        queue_name, _ = connected or disconnected
        queue = Queue.instances[queue_name]
        queue.handle_event(connected, disconnected)

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
    def get_connected_client(self):
        dif = set(self.server.status.queueClients.keys()) - self.old_clients
        if dif:
            client, = dif
            return client

    @classmethod
    def get_disconnected_client(self):
        dif = self.old_clients.difference(self.server.status.queueClients)
        if dif:
            client, = dif
            return client

    


if __name__ == '__main__':
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)