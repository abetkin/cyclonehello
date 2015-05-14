

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
        if QueueEvent.monast is None:
            QueueEvent.monast = self
        with ipdb.launch_ipdb_on_exception():
            QueueEvent.update()



from itertools import groupby

class QueueEvent(dict):
    '''
    Info about the longest waiting client in this queue.
    Defines server-sent event to browser.
    '''

    SERVER = 'Main'
    
    monast = None # TODO fix

    clients = {} # 3 active clients


    # @classmethod
    # def get_new_clients(cls):
    #     1

    @classmethod
    def up_to_date(cls, queue_name):
        server = cls.monast.servers.get(cls.SERVER)
        for q_name, iden in cls.clients:
            if queue_name == q_name:
                return (q_name, iden) in server.status.queueClients


    @classmethod
    def update(cls):
        monast = cls.monast
        server = monast.servers.get(cls.SERVER)

        queue_clients = server.status.queueClients
        events = [] # X

        for q_name, clients in groupby(queue_clients, key=lambda item: item[0]):
            # alr processed
            # TODO only timer up to date
            if cls.up_to_date(q_name):
                continue
            clients = list(clients)
            waiting_longest = max(clients,
                                  key=lambda k: queue_clients[k].seconds)
            client = queue_clients[waiting_longest]
            cls.clients[waiting_longest] = client
            event = cls(
                queue_name = q_name,
                time_waiting = client.seconds,
                count = len(clients),
            )
            events.append(event)

        # if events:
        #
        #     ipdb.set_trace()
            monast.sendEvent(json.dumps(event))


    #
    # @classmethod
    # def update(cls, monast):
    #     server = monast.servers.get(cls.SERVER)
    #     for tupl in cls.clients.items():
    #         if tupl in server.status.queueClients:
    #             continue
    #         # import ipdb
    #         # ipdb.set_trace()
    #         cls.clients.remove(tupl)
    #         queue_name, _ = tupl
    #         queue_clients = filter(lambda c: c[0] == queue_name,
    #                                server.status.queueClients)
    #         longest_waiting = max(queue_clients,
    #                               key=lambda k: queue_clients[k].seconds)
    #         cls.clients[longest_waiting] = queue_clients[longest_waiting]
    #
    #         event = cls(
    #             queue_name = queue_name,
    #             time_waiting = queue_clients[longest_waiting].seconds,
    #             count = len(queue_clients),
    #         )
    #         monast.send(json.dumps(event))
    '''
    def __init__(self, name):
        1
    
    # current_channel
    # keys(): del self._current

    @property
    def time(self):
        1

    def __init__(self, monast, queuename):
        self.server = monast.servers.get(self.SERVER)
        self.clients = self.server.status.queueClients
        self.channels = self.server.status.channels
        self.queue = self.server.status.queues.values()[0]

    def jsonify(self, ):
        dic = dict((field, getattr(self, field)) for field in self.FIELDS)
        return json.dumps(dic)


    def channels(self):
        1

    
    @field
    def onhold_max(self, ):
        return 2

    @field
    def num_calls(self):
        return 1
    
    @field
    def starttime(self):
        1
    '''




if __name__ == '__main__':
    reactor.listenTCP(8899, Application(), interface="0.0.0.0")
    RunMonast(Mona)