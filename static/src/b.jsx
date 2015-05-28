var OverlayTrigger = ReactBootstrap.OverlayTrigger;
var Popover = ReactBootstrap.Popover;

var repr_time = function(data){
    if (data == undefined) {
      return undefined;
    }
    var sec_num = parseInt(data, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (minutes < 10) {minutes = "0" + minutes;}
    if (seconds < 10) {seconds = "0" + seconds;}
    var time = minutes + ':' + seconds;
    if (hours) {
      if (hours < 10) hours  = "0" + hours;
      time = hours + ':' + time;
    }
    return time;
}

var TalkingInfo = React.createClass({
    getInitialState: function() {
      var agents = {}, times = {}, info=this.props.info;
      Object.keys(info).map(function(key){
          agents[key] = info[key].agent;
          times[key] = info[key].time;
      });
      this.times = times;
      return {
        agents: agents,
        times: times,
      }
    },
    componentWillReceiveProps: function(nextProps) {
      if (!nextProps.info){
        return;
      }
      var agents = {}, times = {};
      Object.keys(nextProps.info).map(function(key){
          agents[key] = nextProps.info[key].agent;
          if (!this.state.times[key]){
            times[key] = nextProps.info[key].time;
          } else {
            times[key] = this.state.times[key]
          }
      }.bind(this));
      this.times = times;
      this.setState({
        agents: agents,
        times: times,
      });
    },
    componentDidMount: function() {
      this.timer = window.setInterval(this.onTimer, 1000);
    },
    onTimer: function(){
      Object.keys(this.times).map(function(key){
          this.times[key] = this.times[key] + 1;
      }.bind(this));

      if (Object.keys(this.times).length && this.isMounted()) {
          this.setState({times: this.times});
      }
    },
    showTalkingTime: function(){
      var times = this.state.times;
      var channel_ids = Object.keys(times);
      var time = null;
      channel_ids.map(function (key){
        if (time === null || time < times[key]) {
          time = times[key];
        }
      });
      if (!channel_ids.length) {
        return '';
      };
      time = repr_time(time);
      return (channel_ids.length == 1 ? '': channel_ids.length)
              + '\u260E ' + time;
    },
    makePopup: function(){
      var channel_ids = Object.keys(this.state.agents);
      return (
      <table className="table table-condensed">
        <tbody>
          {channel_ids.map(function(key) {
              return (
                <tr>
                    <td>{this.state.agents[key]}</td>
                    <td>{repr_time(this.state.times[key])}</td>
                </tr>
              )}.bind(this))}
        </tbody>
      </table>
      );
    },
    render: function(){
      return (
      <OverlayTrigger trigger='hover' placement='bottom'
            overlay={<Popover title='Agents:'>
            {this.makePopup()}
            </Popover>}>
        <div id="talking_time">{this.showTalkingTime()}</div>
      </OverlayTrigger>
      );
    }
});

var WaitingTime = React.createClass({
    getInitialState: function() {
      this.timer = this.props.time;
      return {
        time: this.props.time,
      };
    },
    componentWillReceiveProps: function(nextProps) {
      this.setState({time: nextProps.time});
    },
    onTimer: function(){
      var danger_time = parseInt(this.props.dangerTime);
      this.timer = this.state.time + 1;
      if (this.timer > this.state.dangerTime) {
        this.props.setDanger();
      } else {
        this.props.unsetDanger();
      }
      if (this.isMounted()) {
        this.setState({time: this.timer});
      }
      
    },
    componentDidMount: function() {
      this.timer = window.setInterval(this.onTimer, 1000);
    },
    render: function(){
        return (
          <div id="waiting_time">
          <center><h4> &#8987; {repr_time(this.state.time)} </h4></center>
          </div>
        )
    }
});

var Queue = React.createClass({
    getInitialState: function() {
     return {
        count_waiting: this.props.data.count_waiting,
        time_waiting: this.props.data.time_waiting,
        talking_channels: this.props.data.talking_channels,
        danger: this.props.data.danger,
      };
    },
    setDanger: function(){
      if (!this.state.danger && this.isMounted()) {
        this.setState({danger: true});
      }
    },
    unsetDanger: function(){
      if (this.state.danger && this.isMounted()) {
        this.setState({danger: false});
      }
    },
    componentDidMount: function() {
      this.setState(this.props.data);
    },
    componentWillReceiveProps: function(nextProps) {
      if (!nextProps.event) {
        return;
      }
      var data = jQuery.extend({}, this.state, nextProps.event);
      this.setState(data);
    },
    formatHeader: function(){
        var talking_channels = this.state.talking_channels;
        if (!talking_channels || !Object.keys(talking_channels).length) {
          return <center>{this.state.name}</center>;
        }
        return (<div>
          <span className="pull-left">{this.props.data.name}</span>
          <span className="pull-right">
            <TalkingInfo info={talking_channels} key={this.name}/>
          </span>
          <div className="clearfix"></div>
        </div>)
    },
    formatRow: function(typ) {
          return (
          <tr>
              <td className={this.state.danger?"danger":"success"}>
                {typ == 'last_row'?
                <WaitingTime time={this.state.time_waiting}
                             setDanger={this.setDanger}
                             unsetDanger={this.unsetDanger}
                             dangerTime={this.props.data.danger_time}
                             key={self.name}/>: ''}
              </td>
          </tr>
    )},
    formatCount: function(){
        if (this.state.count_waiting == 0) {
          return undefined;
        }
        return (<tr><td><center><h4>
            {this.state.count_waiting}
            </h4></center></td></tr>);
    },
    render: function(){
      var range = [], i = 0;
      if (this.state.count_waiting > 0) {
        while (++i <= this.state.count_waiting - 1) range.push('row');
        range.push('last_row')
      }
      return (
    <div className="col-xs-1">
    <table className="table table-condensed">
      <thead>
        <tr>
          <th>{this.formatHeader()}</th>
        </tr>
      </thead>
      <tbody>
        {range.map(this.formatRow)}
        {this.formatCount()}
      </tbody>
    </table>
  </div>
    );
    }

});

var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      data = JSON.parse(ev.data);
      this.setState({queues: this.state.queues, event: data});
    },
    getInitialState: function() {
        return {
          queues: queues_json,
          event: {},
        }
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },
    render: function(){
      var queues = this.state.queues;
      var q_names = Object.keys(queues);
      var event = this.state.event;
      q_names.sort();
      return (
        <div className="row">
            {q_names.map(function(q_name) {
                return (
                  <Queue data={queues[q_name]}
                         event={event.q_name == q_name ? event: null}
                         key={q_name}/>
                );
            })}
        </div>
        );
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));