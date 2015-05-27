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

var Queue = React.createClass({

    getInitialState: function() {
     return {
        count_waiting: this.props.data.count_waiting,
        name: this.props.data.name,
        time_waiting: this.props.data.time_waiting,
        time_talking: this.props.data.time_talking,
        danger: this.props.data.danger,
        danger_time: this.props.data.danger_time,
      };
    },
    periodicTask: function(){
      state = {
        count_waiting: this.state.count_waiting,
        danger: this.state.danger
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
      if (this.state.time_talking != undefined) {
        state.time_talking = this.state.time_talking + 1;
      }
      this.setState(state);
    },
    componentDidMount: function() {
      this.setState(this.props.data);
      this.timer = window.setInterval(this.periodicTask, 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      if (!nextProps.event) {
        return;
      }
      var state = jQuery.extend({}, this.state);
      var data = jQuery.extend(state, nextProps.event);
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
        return <center><h4> &#8987; {repr_time(this.state.time_waiting)} </h4></center>;
      }.bind(this);

      var showCount = function(){
        if (this.state.count_waiting == 0) {
          return undefined;
        }
        return <tr><td><center><h4> {this.state.count_waiting} </h4></center></td></tr>;
      }.bind(this);

      var formatHeader = function(){
          var talking_time = showTalkingTime();
          if (!talking_time) {
            return <center>{this.state.name}</center>;
          }
          return (<div>
            <span className="pull-left">{this.state.name}</span>
            <span className="pull-right">{showTalkingTime()}</span>
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
      info = {};
      info[data.q_name] = data;
      this.state.queues[data.q_name] = data;
      var queues = jQuery.extend(info, this.state.queues);

      this.setState({queues: queues, event: data});
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