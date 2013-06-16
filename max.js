// ----------------------------------------------------------------------------
// the Max/MSP related interface
// (c) Pascal Gauthier 2013, under the CC BY-SA 3.0
//

inlets = 1
outlets = 2

var undo_buffer = []

// the value of code window in max
var current_code = ""

// called by max to update the textedit containing the code value
function UpdateCode(code, text) {
   if (_.isUndefined(text))
      return
   if (text.charAt(0) == '"') {
      text = code.substring(1, text.length - 1)
   }
   current_code = text
}


function GetClip() {
   fillGlobalVar()
   api = new LiveAPI("live_set view detail_clip");
   selected = api.call("select_all_notes");
   rawNotes = api.call("get_selected_notes");

   if (rawNotes[0] !== "notes") {
      glasgow_error("Unexpected note output!");
      return;
   }

   _gsLastGetClip = []
   maxNumNotes = rawNotes[1];

   for (var i = 2; i < (maxNumNotes * 6); i += 6) {
      var note = rawNotes[i + 1]
      var tm = rawNotes[i + 2]
      var dur = rawNotes[i + 3]
      var velo = rawNotes[i + 4]
      var muted = rawNotes[i + 5] === 1

      // if this is a valid note
      if (rawNotes[i] === "note" && _.isNumber(note) && _.isNumber(tm) && _.isNumber(dur) && _.isNumber(velo)) {
         _gsLastGetClip.push( [ tm, note, velo, dur ] )
      } else {
         glasgow_error("unkown note returned by Live")
         return
      }
   }

   /* Live doesnt return the events in a sorted order. We do: <3 underscore */
   _gsLastGetClip = __.sortBy(_gsLastGetClip, function(n) { n[0] })
   first = ""
   ret = "["
   for(var i=0;i<_gsLastGetClip.length;i++) {
         ret = ret + first + "[" + _gsLastGetClip[i][0] + ", " + _gsLastGetClip[i][1] + ", " + _gsLastGetClip[i][2] + ", " + _gsLastGetClip[i][3] + "]"
         first = ",\n"
   }
   ret = ret + "]"
   push_undo()
   outlet(1, 'set', ret)
   glasgow_info("GetClip successful")
}


function PutClip() {
   var out = evalcode()
   if (out == null)
      return;

   if (!_.isArray(out)) {
      glasgow_error("evaluation is not a array")
      return;
   }
   if (out.length == 0) {
      glasgow_error("array is empty")
      return;
   }

   var success = 1
   var out = _.flatten(out, true)
   var api = new LiveAPI("live_set view detail_clip");
   api.call("select_all_notes");
   api.call("replace_selected_notes");
   api.call("notes", out.length)
   for (i = 0; i < out.length; i++) {
      if (out[i].length != 4) {
         glasgow_info(out)
         glasgow_error("skipping content of wrong size, index: " + i)
         success = 0
         break
      }

      // pitch time duration velocity muted
      tm = Number(out[i][0]).toFixed(12)
      note = out[i][1]
      velo = out[i][2]
      dur = Number(out[i][3]).toFixed(12)

      if (_.isNaN(tm)) {
         glasgow_error("wrong time defined : " + tm + ", index: " + i)
         success = 0
         break
      }

      if (_.isNaN(note)) {
         glasgow_error("wrong note defined : " + note + ", index: " + i)
         success = 0
         break
      }

      if (_.isNaN(velo)) {
         glasgow_error("wrong velocity defined : " + velo + ", index: " + i)
         success = 0
         break
      }

      if (_.isNaN(dur)) {
         glasgow_error("wrong duration defined : " + dur + ", index: " + i)
         success = 0
         break
      }

      ln = ["note", note, tm, dur, velo, 0]
      api.call(ln)
   }
   api.call("done")
   if (success == 1) {
      glasgow_info("PutClip successful")
   }
}


function Evaluate() {
   out = evalcode()
   if (out == null)
      return;

   outstr = String(out)
   if (_.isNumber(out)) {
      glasgow_info("result: " + outstr)
      return;
   }

   if (_.isString(out)) {
      glasgow_info("result: " + outstr)
      return;
   }

   if (_.isArray(out)) {
      push_undo()
      outlet(1, "set", render_array(out))
      glasgow_info("done changed")
      return;
   }
   glasgow_error("unkown type")

}


function Undo() {
   if (undo_buffer.length > 0) {
      undo_content = undo_buffer.pop()
      outlet(1, "set", undo_content)
   }
}


/**
 * Will work in the future 
 */
function LoadLib() {
   folder = new Folder("glasgow-lib");

   folder.typelist = ["TEXT"];

   while (!folder.end) {
      post(folder.filename + "\n")
      folder.next()
   }
   folder.close()

   /*post("loading file: " + filename)
   access = "read";
   typelist = new Array("iLaF" , "maxb" , "TEXT" );
   f = new File(filename, access, typelist);
   pgm = f.readstring(65535);
   interpret(pgm)
   f.close()  */
}


function evalcode() {
   fillGlobalVar()
   try {
      /* undocumented feature, if it starts with ( it is considered a
         lisp snippet */
      if ( current_code.charAt(0) == '(') {
         glasgow_info("using lisp engine to parse snippet")
         out = interpret(current_code)
      } else {
         out = eval(current_code)
      }
   } catch (err) {
      glasgow_error(String(err))
      out = null
   }
   return out
}


function render_array(a) {
   ret = "["
   f1 = ""
   for (i = 0; i < a.length; i++) {
      if (_.isArray(a[i])) {
         ret += f1 + " ["
         f2 = ""
         for (j = 0; j < a[i].length; j++) {
            ret += f2 + a[i][j]
            f2 = " ,"
         }
         ret += "]"
      } else {
         ret += f1 + String(a[i])
      }
      f1 = " ,\n"
   }
   glasgow_info(ret)
   return ret + "]"
}


function push_undo() {
   if (undo_buffer.length > 30)
      undo_buffer.shift()
   if (undo_buffer.length != 0) {
      tst_last = undo_buffer.pop()
      undo_buffer.push(tst_last)
      if (tst_last != current_code)
         undo_buffer.push(current_code)
   } else {
      undo_buffer.push(current_code)
   }
}


function fillGlobalVar() {
   api = new LiveAPI("live_set view detail_clip");
   _gsClipStart = api.get("loop_start")[0]
   _gsClipEnd = api.get("loop_end")[0]
}


function glasgow_info(msg) {
   post(msg + "\n")
   outlet(0, "textcolor", "0", "0", "0", "1")
   outlet(0, "set", msg)
}


function glasgow_error(msg) {
   error(msg + "\n")
   outlet(0, "textcolor", "255", "0", "0", "1")
   outlet(0, "set", msg)
}


// hack to support underscore in max/msp :(
__ = _

