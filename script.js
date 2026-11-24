const codeBox=document.getElementById('code');
const count=document.getElementById('charCount');
const btn=document.getElementById('analyzeBtn');
const results=document.getElementById('results');
const errorBox=document.getElementById('errorBox');
codeBox.addEventListener('input',()=>count.textContent=codeBox.value.length+' characters');
document.getElementById('sampleBtn').addEventListener('click',()=>{
 codeBox.value="def calculateTotal(price, quantity):\n    try:\n        total=price*quantity\n        print('Total:',total)  \n    except:\n        print('Something went wrong')\n\ncalculateTotal(10, 3)";
 count.textContent=codeBox.value.length+' characters';
});
btn.addEventListener('click',async()=>{
 errorBox.classList.add('hidden'); results.classList.add('hidden');
 if(!codeBox.value.trim()){showError('Please paste some Python code first.');return;}
 btn.disabled=true;btn.textContent='Analyzing...';
 try{
  const res=await fetch('/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:codeBox.value})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Analysis failed');
  document.getElementById('score').textContent=data.score;
  const status=document.getElementById('syntaxStatus');
  status.textContent=data.syntax_ok?'✓ No syntax errors detected.':'⚠ Syntax error detected. Review the issue below.';
  status.className='status'+(data.syntax_ok?'':' bad');
  const issues=document.getElementById('issues');issues.innerHTML='';
  if(!data.issues.length)issues.innerHTML='<div class="issue"><b>Looks good!</b><p>No issues were detected by the basic checks.</p></div>';
  data.issues.forEach(x=>{const div=document.createElement('div');div.className='issue';div.innerHTML=`<div class="issue-head"><b></b><small></small></div><p></p><em></em>`;div.querySelector('b').textContent=x.type;div.querySelector('small').textContent=x.line?'Line '+x.line:'General';div.querySelector('p').textContent=x.message;div.querySelector('em').textContent='Tip: '+x.tip;issues.appendChild(div);});
  const list=document.getElementById('suggestions');list.innerHTML='';data.suggestions.forEach(s=>{const li=document.createElement('li');li.textContent=s;list.appendChild(li);});
  const aiPanel=document.getElementById('aiPanel');
  if(data.ai_review){aiPanel.classList.remove('hidden');document.getElementById('aiReview').textContent=data.ai_review;}else aiPanel.classList.add('hidden');
  results.classList.remove('hidden');results.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){showError(e.message);}finally{btn.disabled=false;btn.textContent='✦ Analyze my code';}
});
function showError(msg){errorBox.textContent=msg;errorBox.classList.remove('hidden');}
