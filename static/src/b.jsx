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
      return {info: jQuery.extend({}, this.props.info)};
    },
    componentWillReceiveProps: function(nextProps) {
      if (!nextProps.info) {
        return;
      }
      console.log('receive', nextProps.info);
      this.setState({info: nextProps.info});
    },
    showTalkingTime: function(){
      var info = this.state.info;
      var channel_ids = Object.keys(info);
      var time = null;
      channel_ids.forEach(function (key){
        if (time === null || time < info[key]) {
          time = info[key];
        }
      });
      if (!channel_ids.length) {
        return '';
      };
      time = repr_time(time);
      return (channel_ids.length == 1 ? '': channel_ids.length)
              + '\u260E ' + time;
    },
    onTimer: function(){
      var channel_ids = Object.keys(this.state.info);
      info = {};
      channel_ids.map(function(key) {
        info[key].agent = this.state.info[key].agent;
        info[key].time = this.state.info[key].time + 1;
      });
      this.setState({info: info});
    },
    componentDidMount: function() {
      this.timer = window.setInterval(this.onTimer, 1000);
      $("#talking_time").hover(this.showPopup, this.hidePopup);
    },
    makePopup: function(){
      var info = this.state.info;
      var channel_ids = Object.keys(info);
      return (
      <table className="table table-condensed">
        <tbody>
          {channel_ids.map(function(key) {
              return (
                <tr>
                    <td>{info[key].agent}</td>
                    <td>{info[key].time}</td>
                </tr>
              )})}
        </tbody>
      </table>
      );
    },
    showPopup: function(hoveritem){
      popup = document.getElementById("popup");
      popup.style.visibility = "Visible";
    },
    hidePopup: function(){
      popup = document.getElementById("popup");
      popup.style.visibility = "Hidden";
    },
    render: function(){
      return (
      <div>
        <div id="talking_time">{this.showTalkingTime()}</div>
        <div id="popup" style={{visibility: "hidden"}}>
        {this.makePopup()}
        </div>
      </div>
      );
    }
});

var Queue = React.createClass({

    getInitialState: function() {
     return {
        count_waiting: this.props.data.count_waiting,
        name: this.props.data.name,
        time_waiting: this.props.data.time_waiting,
        talking_channels: this.props.data.talking_channels,
        danger: this.props.data.danger,
        danger_time: this.props.data.danger_time,
      };
    },
    periodicTask: function(){
      state = {
        count_waiting: this.state.count_waiting,
        danger: this.state.danger,
        talking_channels: this.state.talking_channels,
      };
      var danger_time = parseInt(this.state.danger_time);
      if (this.state.count_waiting && this.state.time_waiting != undefined){
        state.time_waiting = this.state.time_waiting + 1;
        if (state.time_waiting > danger_time) {
          state.danger = true;
        }
      } else {
          state.danger = false;
      }
      this.setState(state);
    },
    componentDidMount: function() {
      this.setState(this.props.data);
      this.timer = window.setInterval(this.periodicTask, 1000);
      $("#waiting_time").hover(function(){
          $(this).css("background-color", "yellow");
          }, function(){
          $(this).css("background-color", "pink");
      });
    },
    componentWillReceiveProps: function(nextProps) {
      if (!nextProps.event) {
        return;
      }
      var data = jQuery.extend({}, this.state, nextProps.event);
      this.setState(data);
    },
    render: function(){
      var showTalkingTime = function(){
          var count_talking = this.state.count_talking;
          if (!count_talking) {
            return '';
          }
          var time_talking = repr_time(this.state.time_talking);
          return (count_talking == 1? '': count_talking)
                  + '\u260E ' + time_talking;
      }.bind(this);

      var range = [], i = 0;
      if (this.state.count_waiting > 0) {
        while (++i <= this.state.count_waiting - 1) range.push('blank');
        range.push('time')
      }
      var showWaitingTime = function(){
        return (<div id="waiting_time">
                <center><h4> &#8987; {repr_time(this.state.time_waiting)} </h4></center>
                </div>)
      }.bind(this);

      var showCount = function(){
        if (this.state.count_waiting == 0) {
          return undefined;
        }
        return <tr><td><center><h4> {this.state.count_waiting} </h4></center></td></tr>;
      }.bind(this);

      var formatHeader = function(){
          var talking_channels = this.state.talking_channels;
          if (!talking_channels) {
            return <center>{this.state.name}</center>;
          }
          return (<div>
            <span className="pull-left">{this.state.name}</span>
            <span className="pull-right">
              <TalkingInfo info={talking_channels}/>
            </span>
            <div className="clearfix"></div>
          </div>)
      }.bind(this);

      return (
    <div className="col-xs-1">
    <table className="table table-condensed">
      <thead>
        <tr>
          <th>{formatHeader()}</th>
        </tr>
      </thead>
      <tbody>
        {range.map(function(typ) {
          return (
          <tr>
              <td className={this.state.danger?"danger":"success"}>
                {typ == 'time'? showWaitingTime(): ''}
              </td>
          </tr>
          )}.bind(this))}
        {showCount()}
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
      // only if length changes
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