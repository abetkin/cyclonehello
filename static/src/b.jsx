var Timer = React.createClass({
    getInitialState: function() {
      return {}
    },
    componentDidMount: function() {
      if (this.state.value === undefined && this.props.time_waiting) {
          this.setState({value: this.props.time_waiting});
      }
      window.setInterval(function(){
        if (this.state.value == '-') {
          return;
        }
        this.setState({value: this.state.value + 1});
      }.bind(this), 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      if (nextProps.time === undefined) {
        return;
      }
      this.setState({value: nextProps.time})
    },
    render: function(){
        var value = this.state.value;
        if (value != '-'){
          value = (value + '').toHHMMSS()
        }
        return (
          <div>{value}</div>
        )
    }
});

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0" + hours;}
    if (minutes < 10) {minutes = "0" + minutes;}
    if (seconds < 10) {seconds = "0" + seconds;}
    var time    = hours + ':' + minutes + ':' + seconds;
    return time;
}

var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      data = JSON.parse(ev.data)
      console.log('ev', data.q_name, data.time_waiting, data.count)
      info = {}
      info[data.q_name] = data
      this.state.queues[data.q_name] = data
      var queues = jQuery.extend(info, this.state.queues);

      this.setState({queues: queues, event: data})
      // only if length changes
    },
    getInitialState: function() {
        // init. state
        return {
          queues: queues_json,
          event: {},
        }
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },
    render: function(){
        var q_names = Object.keys(this.state.queues);
        q_names.sort();
        console.log(q_names)
        var queues = this.state.queues;
        var event = this.state.event;

        return (
          <div className="row">
            <div className="col-md-6">
              <table className="table">
                <thead>
                  <tr>
                    {q_names.map(function(q_name) {
                      return <th>{q_name}</th>
                    }, this)}
                  </tr>
                </thead>
                <tbody>
                    <tr>
                      {q_names.map(function(q_name) {
                        return <td>Звонков: {queues[q_name].count}</td>
                      }, this)}
                    </tr>
                    <tr>
                      {q_names.map(function(q_name) {
                        if (event && event.q_name == q_name){
                          if (event.count <= 0) {
                            var time_waiting = '-'
                          } else if (event.time_waiting !== null) {
                            var time_waiting = event.time_waiting;
                          } else {
                            var time_waiting = undefined;
                          }
                        } else {
                          var time_waiting = queues[q_name].time_waiting
                        }
                        console.log('time> ', time_waiting)
                        return <td>Ожидание: <Timer time={time_waiting}/></td>
                      }, this)}
                    </tr>
                </tbody>
              </table>
            </div>
          </div>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));