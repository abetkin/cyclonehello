

import json

from twisted.internet import reactor

import cyclone.web
import cyclone.sse
from monast import Monast, RunMonast

import ipdb

SERVER = 'Main'
DANGER_TIME = 60

class MainHandler(cyclone.web.RequestHandler):

    def get(self):
        # with ipdb.launch_ipdb_on_exception():
        Queue.ensure_instances()

        def queues():
            for queue in Queue.instances.values():
                yield queue.name, {
                    'name': queue.name,
                    'time_waiting': queue.time_waiting,
                    'count_waiting': queue.count_waiting,
                    'time_talking': queue.time_talking,
                    'count_talking': queue.count_talking,
                    'danger': queue.danger,
                    'danger_time': DANGER_TIME,
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
        Queue.ensure_instances()
        for queue in Queue.instances.values():
            queue.do_update()


import time

from itertools import groupby

class Queue(object):
    SERVER = 'Main'
    
    instances = None # {queue name: queue}

    longest_waiting = None
    longest_talking = None
    oldest_join_time = None
    oldest_call_time = None
    count_waiting = 0
    count_talking = 0

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

    @property
    def time_waiting(self):
        if self.longest_waiting:
            return int(time.time() - self.oldest_join_time)

    @property
    def time_talking(self):
        if self.longest_talking:
            return int(time.time() - self.oldest_call_time)

    def send_event(self, old_state):
        event = {}
        if self.count_waiting != old_state['count_waiting']:
            event['count_waiting'] = self.count_waiting
        if old_state['longest_waiting'] != self.longest_waiting:
            event['time_waiting'] = self.time_waiting
        if old_state['count_talking'] != self.count_talking:
            event['count_talking'] = self.count_talking
        if old_state['longest_talking'] != self.longest_talking:
            event['time_talking'] =  self.time_talking
        if event:
            event['q_name'] = self.name
            Mona.instance.sendEvent(json.dumps(event))
    
    @property
    def danger(self):
        ''''''
        return self.time_waiting > DANGER_TIME

    def do_update(self, send_event=True):
        old_state = {
            'count_waiting': self.count_waiting,
            'count_talking': self.count_talking,
            'longest_waiting': self.longest_waiting,
            'longest_talking': self.longest_talking,
        }
        # Determine the longest waiting client
        count_waiting = 0
        join_time = None
        longest_waiting = None
        clients = self.server.status.queueClients
        for (q_name, iden), client in clients.items():
            if self.name == q_name:
                count_waiting += 1
                if join_time is None or client.jointime < join_time:
                    join_time = client.jointime
                    longest_waiting = iden
        self.count_waiting = count_waiting
        self.longest_waiting = longest_waiting
        self.oldest_join_time = join_time
        # Get the longest call
        count_talking = 0
        longest_talking = None
        call_time = None
        for client_id, call in self.server.status.queueCalls.items():
            if self.name == call.client['queue']:
                count_talking += 1
                if call_time is None or call.starttime < call_time:
                    longest_talking = client_id
                    call_time = call.starttime
        self.longest_talking = longest_talking
        self.oldest_call_time = call_time
        self.count_talking = count_talking
        if send_event:
            self.send_event(old_state)


if __name__ == '__main__':
    # ipdb.set_trace()
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)