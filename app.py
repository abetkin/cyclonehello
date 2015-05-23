

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

import ipdb

SERVER = 'Main'

class MainHandler(cyclone.web.RequestHandler):

    def get(self):
        with ipdb.launch_ipdb_on_exception():
            Queue.ensure_instances()
    
            def queues():
                for queue in Queue.instances.values():
                    yield queue.name, {
                        'name': queue.name,
                        'time_waiting': queue.time_waiting,
                        'time_talking': queue.time_talking,
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
    client_talking = None
    time_talking = None
    time_waiting = None
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

    def get_client_talking(self):
        for client_id, call in self.server.status.queueCalls.items():
            if self.name == call.client['queue']:
                return client_id, int(time.time() - call.starttime)
        return (None, None)


    def get_state(self):
        clients = self.server.status.queueClients


    def do_update(self, send_event=True):
        count = 0
        time_joined = None
        longest_waiting = None
        clients = self.server.status.queueClients
        for (q_name, iden), client in clients.items():
            if (self.name == q_name):
                count += 1
                if time_joined is None or client.jointime < time_joined:
                    time_joined = client.jointime
                    longest_waiting = iden
        self.client_talking, self.time_talking = self.get_client_talking()
        smth_changed = count != self.count
        self.count = count
        if client_talking == self.client_talking:
            time_talking = None
        else:
            
            time_talking = self.time_talking
            self.client_talking = client_talking
            smth_changed = True
        send_event = send_event and smth_changed
        if time_joined is not None:
            self.time_waiting = int(time.time() - time_joined)
        if longest_waiting == self.longest_waiting or time_joined is None:
            time_waiting = None
        else:
            self.longest_waiting = longest_waiting
            time_waiting = self.time_waiting
        
        # TODO .__dict__.update(...)
        
        if send_event:
            event = {
                'time_talking': time_talking,
                'time_waiting': time_waiting,
                'q_name': self.name,
                'count': self.count,
            }
            Mona.instance.sendEvent(json.dumps(event))


if __name__ == '__main__':
    # ipdb.set_trace()
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)