var Timer = React.createClass({
    getInitialState: function() {
      return {value: '-'}
    },
    componentDidMount: function() {
      window.setInterval(function(){
        if (this.state.value != '-') {
          this.setState({value: this.state.value + 1})
        }
      }.bind(thiss), 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      if (1) {
        //code
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
      info = {}
      info[data.queue_name] = data
      this.state.queues[data.queue_name] = data
      var queues = jQuery.extend(info, this.state.queues);
      if (1) {
        1;
      }
      this.setState({queues: queues})
      // only if length changes
    },
    onChListener: function() {

    },
    getInitialState: function() {
        return {queues: {}}
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },
    render: function(){
        var q_names = Object.keys(this.state.queues);
        q_names.sort();
        var queues = this.state.queues;

        return (
          <div className="row">
            <div className="col-md-6">
              <table className="table">
                <thead>
                    {q_names.map(function(q_name) {
                      return <th>{q_name}</th>
                    }, this)}
                </thead>
                <tbody>
                    <tr>
                      {q_names.map(function(q_name) {
                        return <td>Звонков: {queues[q_name].count}</td>
                      }, this)}
                    </tr>
                    <tr>
                      {q_names.map(function(q_name) {
                        return <td>Ожидание: <Timer time={queues[q_name].time_waiting}/></td>
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