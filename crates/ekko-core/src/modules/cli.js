// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function(ops){

var E='\x1b[';
function _w(s){if(ops.write)ops.write(s);else{var p=typeof process!=='undefined'&&process.stdout;if(p&&p.write)p.write(s);}}
function red(s){return E+'31m'+s+E+'0m';}
function green(s){return E+'32m'+s+E+'0m';}
function yellow(s){return E+'33m'+s+E+'0m';}
function blue(s){return E+'34m'+s+E+'0m';}
function magenta(s){return E+'35m'+s+E+'0m';}
function cyan(s){return E+'36m'+s+E+'0m';}
function white(s){return E+'37m'+s+E+'0m';}
function gray(s){return E+'90m'+s+E+'0m';}
function bold(s){return E+'1m'+s+E+'0m';}
function dim(s){return E+'2m'+s+E+'0m';}
function italic(s){return E+'3m'+s+E+'0m';}
function underline(s){return E+'4m'+s+E+'0m';}
function inverse(s){return E+'7m'+s+E+'0m';}
function strikethrough(s){return E+'9m'+s+E+'0m';}
function cursorUp(n){_w(E+(n||1)+'A');}
function cursorDown(n){_w(E+(n||1)+'B');}
function cursorLeft(n){_w(E+(n||1)+'D');}
function cursorRight(n){_w(E+(n||1)+'C');}
function clearLine(){_w(E+'2K\r');}
function clearDown(){_w(E+'J');}
function saveCursor(){_w(E+'s');}
function restoreCursor(){_w(E+'u');}
function hideCursor(){_w(E+'?25l');}
function showCursor(){_w(E+'?25h');}
function columns(){try{if(ops.getSize){var c=ops.getSize().columns;if(typeof c==='number'&&c>=1)return c;}}catch{}return 80;}

function wrapText(text,width){
  if(width<8)width=8;
  var out=[];var paras=String(text).split('\n');
  for(var p=0;p<paras.length;p++){
    var words=paras[p].split(/\s+/);var line='';
    for(var i=0;i<words.length;i++){
      if(!words[i])continue;
      var cand=line?line+' '+words[i]:words[i];
      if(cand.length>width&&line){out.push(line);line=words[i];}
      else line=cand;
    }
    out.push(line);
  }
  return out;
}

function parseSignature(sig){
  var parts=sig.trim().split(/\s+/);
  var name=parts[0];var args=[];
  for(var i=1;i<parts.length;i++){
    var p=parts[i];
    if(p.startsWith('<')&&p.endsWith('>'))args.push({name:p.slice(1,-1),required:true});
    else if(p.startsWith('[')&&p.endsWith(']'))args.push({name:p.slice(1,-1),required:false});
  }
  return{name:name,args:args};
}
function parseOptionFlags(flags){
  var parts=flags.split(',').map(function(s){return s.trim();});
  var long=null,short=null,argName=null;
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    if(p.startsWith('--')){
      var spaceIdx=p.indexOf(' ');
      if(spaceIdx>0){long=p.slice(2,spaceIdx);argName=p.slice(spaceIdx+1).replace(/[<>\[\]]/g,'');}
      else{var eqIdx=p.indexOf('=');if(eqIdx>0){long=p.slice(2,eqIdx);argName=p.slice(eqIdx+1).replace(/[<>\[\]]/g,'');}else{long=p.slice(2);}}
    }else if(p.startsWith('-')&&p.length===2){short=p.slice(1);}
  }
  return{long:long,short:short,argName:argName};
}
function Command(name,args){
  this.name=name;this.args=args||[];this.options=[];this.subcommands=[];
  this._description='';this._examples=[];this._action=null;
}
Command.prototype.description=function(d){this._description=d;return this;};
Command.prototype.option=function(flags,desc,opts){
  opts=opts||{};var parsed=parseOptionFlags(flags);
  this.options.push({long:parsed.long,short:parsed.short,argName:parsed.argName,desc:desc,
    type:opts.type||(parsed.argName?'string':'boolean'),default:opts.default,required:opts.required});
  return this;
};
Command.prototype.example=function(ex){this._examples.push(ex);return this;};
Command.prototype.action=function(fn){this._action=fn;return this;};
Command.prototype.command=function(sig){
  var parsed=parseSignature(sig);
  var sub=new Command(parsed.name,parsed.args);
  this.subcommands.push(sub);
  return sub;
};

function formatHelp(app,cmd,path){
  var lines=[];var w=columns();
  if(!cmd){
    lines.push(bold('⚡ '+app._name)+(app._version?' '+dim('v'+app._version):'')+
      (app._description?' '+dim('— '+app._description):''));
    lines.push('');
    lines.push(dim('USAGE'));
    lines.push('  '+app._name+' <command> [options]');
  }else{
    var usage=path;
    for(var a=0;a<cmd.args.length;a++){
      usage+=cmd.args[a].required?' <'+cmd.args[a].name+'>':' ['+cmd.args[a].name+']';
    }
    if(cmd.options.length)usage+=' [options]';
    lines.push(bold(path)+(cmd._description?' '+dim('— '+cmd._description):''));
    lines.push('');
    lines.push(dim('USAGE'));
    lines.push('  '+usage);
  }
  var subs=cmd?cmd.subcommands:(app._commands||[]);
  if(subs.length){
    lines.push('');lines.push(dim('COMMANDS'));
    var maxLen=0;
    for(var i=0;i<subs.length;i++){
      var label=subs[i].name;
      for(var a=0;a<subs[i].args.length;a++)label+=subs[i].args[a].required?' <'+subs[i].args[a].name+'>':' ['+subs[i].args[a].name+']';
      if(label.length>maxLen)maxLen=label.length;
    }
    for(var i=0;i<subs.length;i++){
      var label=subs[i].name;
      for(var a=0;a<subs[i].args.length;a++)label+=subs[i].args[a].required?' <'+subs[i].args[a].name+'>':' ['+subs[i].args[a].name+']';
      var pad='';for(var p=label.length;p<maxLen+4;p++)pad+=' ';
      lines.push('  '+cyan(label)+pad+(subs[i]._description||''));
    }
  }
  var opts=cmd?cmd.options:[];
  opts=[{long:'help',short:'h',desc:'Show help',type:'boolean'},{long:'version',short:'v',desc:'Show version',type:'boolean'}].concat(opts);
  if(opts.length){
    lines.push('');lines.push(dim('OPTIONS'));
    var maxOLen=0;
    for(var i=0;i<opts.length;i++){
      var label='--'+opts[i].long;if(opts[i].short)label+=', -'+opts[i].short;
      if(opts[i].argName)label+=' <'+opts[i].argName+'>';
      if(label.length>maxOLen)maxOLen=label.length;
    }
    for(var i=0;i<opts.length;i++){
      var label='--'+opts[i].long;if(opts[i].short)label+=', -'+opts[i].short;
      if(opts[i].argName)label+=' <'+opts[i].argName+'>';
      var pad='';for(var p=label.length;p<maxOLen+4;p++)pad+=' ';
      var def=opts[i].default!==undefined?' '+dim('(default: '+opts[i].default+')'):'';
      lines.push('  '+yellow(label)+pad+opts[i].desc+def);
    }
  }
  var examples=cmd?cmd._examples:(app._examples||[]);
  if(examples.length){
    lines.push('');lines.push(dim('EXAMPLES'));
    for(var i=0;i<examples.length;i++)lines.push('  '+dim('$ ')+examples[i]);
  }
  if(subs.length){
    lines.push('');
    lines.push(dim('Run '+(path||app._name)+' <command> --help for detailed help.'));
  }
  return lines.join('\n');
}

function parseOptions(argv,cmd){
  var parsed={_:[]};var i=0;
  while(i<argv.length){
    var arg=argv[i];
    if(arg==='--'){i++;while(i<argv.length){parsed._.push(argv[i++]);}break;}
    if(arg.startsWith('--no-')){parsed[arg.slice(5)]=false;i++;continue;}
    if(arg.startsWith('--')){
      var eqIdx=arg.indexOf('=');
      if(eqIdx>0){var key=arg.slice(2,eqIdx);parsed[key]=arg.slice(eqIdx+1);i++;continue;}
      var key=arg.slice(2);
      var opt=cmd.options.find(function(o){return o.long===key;});
      if(opt&&opt.type==='boolean'){parsed[key]=true;i++;continue;}
      if(i+1<argv.length&&!argv[i+1].startsWith('-')){parsed[key]=argv[++i];i++;continue;}
      parsed[key]=true;i++;continue;
    }
    if(arg.startsWith('-')&&arg.length===2){
      var ch=arg[1];
      var opt=cmd.options.find(function(o){return o.short===ch;});
      if(opt){
        if(opt.type==='boolean'){parsed[opt.long]=true;i++;continue;}
        if(i+1<argv.length){parsed[opt.long]=argv[++i];i++;continue;}
      }
      parsed[ch]=true;i++;continue;
    }
    parsed._.push(arg);i++;
  }
  for(var j=0;j<cmd.options.length;j++){
    var o=cmd.options[j];
    if(parsed[o.long]===undefined&&o.default!==undefined)parsed[o.long]=o.default;
    if(parsed[o.long]!==undefined&&o.type==='number')parsed[o.long]=Number(parsed[o.long]);
  }
  for(var j=0;j<cmd.args.length;j++){
    if(parsed._.length>0)parsed[cmd.args[j].name]=parsed._.shift();
  }
  return parsed;
}

function _missingRequired(cmd,args){
  for(var j=0;j<cmd.args.length;j++){var an=cmd.args[j].name;if(cmd.args[j].required&&(args[an]===undefined||args[an]===''))return 'missing required argument <'+an+'>';}
  for(var k=0;k<cmd.options.length;k++){var o=cmd.options[k];if(o.required&&args[o.long]===undefined)return 'missing required option --'+o.long;}
  return null;
}
function cli(name,version){
  var app={_name:name,_version:version,_description:'',_examples:[],_commands:[]};
  app.description=function(d){app._description=d;return app;};
  app.example=function(ex){app._examples.push(ex);return app;};
  app.command=function(sig){
    var parsed=parseSignature(sig);
    var cmd=new Command(parsed.name,parsed.args);
    app._commands.push(cmd);
    return cmd;
  };
  app.run=function(argv){
    if(!argv){
      var raw=Ekko.args;var start=0;
      for(var i=0;i<raw.length;i++){
        if(/\.(ts|js|tsx|jsx|mjs)$/.test(raw[i])){start=i+1;break;}
      }
      if(start===0){
        
        for(var i=0;i<raw.length;i++){
          if(raw[i]==='x'&&i+1<raw.length){start=i+2;break;}
        }
        if(start===0)start=2;
      }
      argv=raw.slice(start);
    }
    return _runCommand(app,app._commands,argv,app._name);
  };
  app.help=function(){console.log(formatHelp(app,null,null));};
  return app;
}
function _runCommand(app,commands,argv,path){
  if(argv.length===0||argv[0]==='--help'||argv[0]==='-h'){console.log(formatHelp(app,null,path));return;}
  if(argv[0]==='--version'||argv[0]==='-v'){console.log(app._version||'0.0.0');return;}
  var cmdName=argv[0];
  var cmd=commands.find(function(c){return c.name===cmdName;});
  if(!cmd){console.error(red('Unknown command: ')+cmdName);console.log('');console.log(formatHelp(app,null,path));return;}
  var rest=argv.slice(1);
  if(rest[0]==='--help'||rest[0]==='-h'){console.log(formatHelp(app,cmd,path+' '+cmdName));return;}
  if(cmd.subcommands.length&&rest.length>0&&!rest[0].startsWith('-')){
    var sub=cmd.subcommands.find(function(s){return s.name===rest[0];});
    if(sub){
      var subRest=rest.slice(1);
      if(subRest[0]==='--help'||subRest[0]==='-h'){console.log(formatHelp(app,sub,path+' '+cmdName+' '+sub.name));return;}
      if(sub._action){var args=parseOptions(subRest,sub);var miss=_missingRequired(sub,args);if(miss){console.error(red('Error: ')+miss);console.log('');console.log(formatHelp(app,sub,path+' '+cmdName+' '+sub.name));return;}return sub._action(args);}
      console.log(formatHelp(app,sub,path+' '+cmdName+' '+sub.name));return;
    }
  }
  if(cmd._action){var args=parseOptions(rest,cmd);var miss=_missingRequired(cmd,args);if(miss){console.error(red('Error: ')+miss);console.log('');console.log(formatHelp(app,cmd,path+' '+cmdName));return;}return cmd._action(args);}
  console.log(formatHelp(app,cmd,path+' '+cmdName));
}

cli.red=red;cli.green=green;cli.yellow=yellow;cli.blue=blue;cli.magenta=magenta;cli.cyan=cyan;
cli.white=white;cli.gray=gray;cli.bold=bold;cli.dim=dim;cli.italic=italic;cli.underline=underline;
cli.inverse=inverse;cli.strikethrough=strikethrough;

async function _readKey(){
  if(!ops.readKey)throw new Error('Interactive prompts require ekko runtime');
  var raw=await ops.readKey();
  if(typeof raw==='string')try{return JSON.parse(raw);}catch{return{key:'None'};}
  return raw;
}
async function promptInput(message,opts){
  opts=opts||{};var value=opts.default||'';
  _w(bold(message)+' ');if(value)_w(value);
  hideCursor();
  try{
    while(true){
      var k=await _readKey();
      if(k.key==='Enter'){_w('\n');showCursor();return value;}
      if(k.key==='Esc'||(k.key==='Char'&&k.char==='c'&&k.ctrl)){_w('\n');showCursor();return null;}
      if(k.key==='Backspace'){
        if(value.length>0){value=value.slice(0,-1);_w('\r'+bold(message)+' '+(opts.mask?opts.mask.repeat(value.length):value)+E+'K');}
        continue;
      }
      if(k.key==='Char'&&k.char&&!k.ctrl&&!k.alt){
        value+=k.char;_w(opts.mask||k.char);
      }
    }
  }catch(e){showCursor();throw e;}
}
async function promptPassword(message){
  return promptInput(message,{mask:'*'});
}
async function promptConfirm(message,opts){
  opts=opts||{};var def=opts.default===true;
  var hint=def?dim(' [Y/n] '):dim(' [y/N] ');
  _w(bold(message)+hint);
  while(true){
    var k=await _readKey();
    if(k.key==='Enter'){_w('\n');return def;}
    if(k.key==='Char'&&(k.char==='y'||k.char==='Y')){_w(green('Yes')+'\n');return true;}
    if(k.key==='Char'&&(k.char==='n'||k.char==='N')){_w(red('No')+'\n');return false;}
    if(k.key==='Esc'||(k.key==='Char'&&k.char==='c'&&k.ctrl)){_w('\n');return null;}
  }
}
async function promptSelect(message,choices,opts){
  opts=opts||{};
  var idx=0;var pageSize=opts.pageSize||Math.min(choices.length,15);var offset=0;
  function visibleCount(){return Math.min(choices.length-offset,pageSize);}

  function descLines(){var c=choices[idx];if(!(typeof c==='object'&&c&&c.description))return [];return wrapText(String(c.description),columns()-4);}
  function lineCount(){var dl=descLines();return visibleCount()+1+(choices.length>pageSize?1:0)+(dl.length?dl.length+1:0);}
  function render(){
    var vis=choices.slice(offset,offset+pageSize);
    _w('\r'+bold(message)+E+'K\n');
    for(var i=0;i<vis.length;i++){
      var ci=offset+i;var sel=ci===idx;
      var label=typeof vis[i]==='string'?vis[i]:(vis[i].label||vis[i].value);
      _w((sel?cyan('❯ '):dim('  '))+label+E+'K\n');
    }
    if(choices.length>pageSize)_w(dim('  ↑↓ scroll ('+choices.length+' items)')+E+'K\n');
    var dl=descLines();
    if(dl.length){
      var buf=E+'K\n';                                       
      for(var di=0;di<dl.length;di++)buf+=dim('  '+dl[di])+E+'K\n';
      _w(buf);
    }
  }
  hideCursor();render();
  var prevLines=lineCount();
  try{
    while(true){
      var k=await _readKey();
      if(k.key==='Enter'){
        cursorUp(prevLines);
        _w('\r'+bold(message)+' '+cyan(typeof choices[idx]==='string'?choices[idx]:(choices[idx].label||choices[idx].value))+E+'K\n');
        clearDown();showCursor();
        return typeof choices[idx]==='string'?choices[idx]:(choices[idx].value!==undefined?choices[idx].value:choices[idx]);
      }
      if(k.key==='Up'){idx=(idx-1+choices.length)%choices.length;if(idx<offset)offset=idx;if(idx>=offset+pageSize)offset=idx-pageSize+1;}
      else if(k.key==='Down'){idx=(idx+1)%choices.length;if(idx>=offset+pageSize)offset=idx-pageSize+1;if(idx<offset)offset=idx;}
      else if(k.key==='Esc'||(k.key==='Char'&&k.char==='c'&&k.ctrl)){cursorUp(prevLines);clearDown();showCursor();return null;}
      else continue;
      cursorUp(prevLines);render();
      var newLines=lineCount();
      if(newLines<prevLines){clearDown();}
      prevLines=newLines;
    }
  }catch(e){showCursor();throw e;}
}
async function promptMultiSelect(message,choices,opts){
  opts=opts||{};
  var checked=[];for(var i=0;i<choices.length;i++)checked.push(!!(choices[i].checked));
  var idx=0;var pageSize=opts.pageSize||Math.min(choices.length,15);var offset=0;
  function visibleCount(){return Math.min(choices.length-offset,pageSize);}
  function lineCount(){return visibleCount()+1+(choices.length>pageSize?1:0);}
  function render(){
    var vis=choices.slice(offset,offset+pageSize);
    _w('\r'+bold(message)+dim(' (space toggle, enter confirm)')+E+'K\n');
    for(var i=0;i<vis.length;i++){
      var ci=offset+i;var sel=ci===idx;
      var label=typeof vis[i]==='string'?vis[i]:(vis[i].label||vis[i].value);
      var box=checked[ci]?green('[x]'):dim('[ ]');
      _w((sel?cyan('❯ '):dim('  '))+box+' '+label+E+'K\n');
    }
    if(choices.length>pageSize)_w(dim('  ↑↓ scroll ('+choices.length+' items)')+E+'K\n');
  }
  hideCursor();render();
  var prevLines=lineCount();
  try{
    while(true){
      var k=await _readKey();
      if(k.key==='Enter'){
        cursorUp(prevLines);
        var selected=[];var labels=[];
        for(var i=0;i<choices.length;i++){if(checked[i]){var c=choices[i];selected.push(typeof c==='string'?c:(c.value!==undefined?c.value:c));labels.push(typeof c==='string'?c:(c.label||c.value));}}
        _w('\r'+bold(message)+' '+cyan(labels.join(', '))+E+'K\n');
        clearDown();showCursor();
        return selected;
      }
      if(k.key==='Char'&&k.char===' '){checked[idx]=!checked[idx];}
      else if(k.key==='Char'&&(k.char==='a'||k.char==='A')){var all=checked.every(function(c){return c;});for(var i=0;i<checked.length;i++)checked[i]=!all;}
      else if(k.key==='Up'){idx=(idx-1+choices.length)%choices.length;if(idx<offset)offset=idx;if(idx>=offset+pageSize)offset=idx-pageSize+1;}
      else if(k.key==='Down'){idx=(idx+1)%choices.length;if(idx>=offset+pageSize)offset=idx-pageSize+1;if(idx<offset)offset=idx;}
      else if(k.key==='Esc'||(k.key==='Char'&&k.char==='c'&&k.ctrl)){cursorUp(prevLines);clearDown();showCursor();return null;}
      else continue;
      cursorUp(prevLines);render();
      var newLines=lineCount();
      if(newLines<prevLines){clearDown();}
      prevLines=newLines;
    }
  }catch(e){showCursor();throw e;}
}
function promptProgress(message,opts){
  opts=opts||{};var total=opts.total||100;var width=opts.width||30;var current=0;var done=false;
  function render(){
    if(done)return;
    var pct=Math.min(100,Math.round(current/total*100));
    var filled=Math.round(width*current/total);
    var bar='';for(var i=0;i<filled;i++)bar+='█';for(var i=filled;i<width;i++)bar+='░';
    _w('\r'+cyan('['+bar+']')+' '+bold(pct+'%')+' '+message+E+'K');
  }
  render();
  return{
    update:function(n){current=n;render();},
    increment:function(n){current+=n||1;render();},
    done:function(msg){done=true;_w('\r'+green('✓ ')+(msg||message)+E+'K\n');}
  };
}
function promptSpinner(message){
  var frames=['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  var i=0;var running=true;
  var id=setInterval(function(){
    if(!running)return;
    _w('\r'+cyan(frames[i%frames.length])+' '+message+E+'K');
    i++;
  },80);
  return{
    update:function(msg){message=msg;},
    success:function(msg){running=false;clearInterval(id);_w('\r'+green('✓ ')+(msg||message)+E+'K\n');},
    fail:function(msg){running=false;clearInterval(id);_w('\r'+red('✗ ')+(msg||message)+E+'K\n');}
  };
}

var prompt={
  input:promptInput,password:promptPassword,confirm:promptConfirm,
  select:promptSelect,multiSelect:promptMultiSelect,
  progress:promptProgress,spinner:promptSpinner,
};

return{cli:cli,prompt:prompt};
})
