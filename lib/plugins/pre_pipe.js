var Token = require("../token");
module.exports = function(stream) {

  stream.each(function() {
    if(this.text == "|" || this.text == "|.") {
      var L = this.expressionStart()
      
      if(this.text=="|." || this.next.assign) {
        this.text = "__" + this.text.slice(1)
        delete this.operator 
        this.word = true
        return 
      }
      
      if(this.text != "|")
        throw("unknown pipe operation")
      
      var fn = this.next
      this.pipe_function = this.next.text
	  this.next.remove()
	  if(this.next.whitespace) this.next.remove()
	  return this.next
    }
  }) 
}