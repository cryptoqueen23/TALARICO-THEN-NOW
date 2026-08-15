document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(id.length>1){
      const target=document.querySelector(id);
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'})}
    }
  });
});

const voteEls = {
  total: document.getElementById('vote-total'),
  yes: document.getElementById('vote-yes'),
  no: document.getElementById('vote-no'),
  absent: document.getElementById('vote-absent'),
  search: document.getElementById('vote-search'),
  session: document.getElementById('vote-session'),
  category: document.getElementById('vote-category'),
  value: document.getElementById('vote-value'),
  keyOnly: document.getElementById('vote-key-only'),
  status: document.getElementById('vote-status'),
  results: document.getElementById('vote-results')
};

let voteData = {votes:[],sessions:[],categories:[]};

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));
}

function prettyVote(value='unknown'){
  return ({
    yes:'YES',
    no:'NO',
    present_not_voting:'PRESENT, NOT VOTING',
    absent:'ABSENT',
    excused:'EXCUSED',
    paired:'PAIRED',
    no_individual_record:'NO INDIVIDUAL RECORD',
    unknown:'UNKNOWN'
  })[value] || String(value).replaceAll('_',' ').toUpperCase();
}

function fillFilters(){
  (voteData.sessions||[]).forEach(s=>{
    const o=document.createElement('option');
    o.value=s.code;
    o.textContent=s.label;
    voteEls.session?.appendChild(o);
  });
  (voteData.categories||[]).forEach(c=>{
    const o=document.createElement('option');
    o.value=c;
    o.textContent=c;
    voteEls.category?.appendChild(o);
  });
}

function updateStats(votes){
  if(!voteEls.total) return;
  voteEls.total.textContent=votes.length.toLocaleString();
  voteEls.yes.textContent=votes.filter(v=>v.talarico_vote==='yes').length.toLocaleString();
  voteEls.no.textContent=votes.filter(v=>v.talarico_vote==='no').length.toLocaleString();
  voteEls.absent.textContent=votes.filter(v=>['absent','excused'].includes(v.talarico_vote)).length.toLocaleString();
}

function filteredVotes(){
  const q=(voteEls.search?.value||'').trim().toLowerCase();
  const session=voteEls.session?.value||'';
  const category=voteEls.category?.value||'';
  const value=voteEls.value?.value||'';
  const keyOnly=Boolean(voteEls.keyOnly?.checked);

  return (voteData.votes||[]).filter(v=>{
    const haystack=[v.bill,v.description,v.category,v.action,v.session,v.notes]
      .filter(Boolean).join(' ').toLowerCase();
    return (!q || haystack.includes(q))
      && (!session || v.session===session)
      && (!category || v.category===category)
      && (!value || v.talarico_vote===value)
      && (!keyOnly || v.key_vote===true);
  }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}

function renderVotes(){
  if(!voteEls.results) return;
  const all=voteData.votes||[];
  updateStats(all);
  const votes=filteredVotes();

  if(!all.length){
    voteEls.status.textContent='Voting-data file connected successfully · 0 records loaded';
    voteEls.results.innerHTML=`
      <div class="voteEmpty">
        <strong>The page is connected to <code>data/talarico-votes.json</code>.</strong><br>
        The JSON file is in the right place, but its <code>votes</code> array is still empty. Add verified records to that array and they will appear here automatically after the site redeploys.
      </div>`;
    return;
  }

  voteEls.status.textContent=`Showing ${votes.length.toLocaleString()} of ${all.length.toLocaleString()} loaded records`;

  if(!votes.length){
    voteEls.results.innerHTML='<div class="voteEmpty"><strong>No matching votes.</strong><br>Try clearing one or more filters.</div>';
    return;
  }

  voteEls.results.innerHTML=votes.map(v=>{
    const source=v.official_source
      ? `<a class="voteSource" href="${escapeHtml(v.official_source)}" target="_blank" rel="noopener">VIEW OFFICIAL RECORD →</a>`
      : '';
    return `
      <article class="voteCard">
        <div>
          <div class="voteBill">${escapeHtml(v.bill||'Record')}</div>
          <div class="voteMeta">${escapeHtml(v.session||'')} ${v.date?'· '+escapeHtml(v.date):''}</div>
        </div>
        <div>
          <h3>${escapeHtml(v.description||v.action||'Recorded House vote')}</h3>
          ${v.action?`<p><strong>Action:</strong> ${escapeHtml(v.action)}</p>`:''}
          <div class="voteTags">
            ${v.category?`<span class="voteTag">${escapeHtml(v.category)}</span>`:''}
            ${v.result?`<span class="voteTag">RESULT: ${escapeHtml(String(v.result).toUpperCase())}</span>`:''}
            ${v.key_vote===true?'<span class="voteTag">KEY VOTE</span>':''}
          </div>
          ${source}
        </div>
        <div class="voteChoice ${escapeHtml(v.talarico_vote||'unknown')}">${prettyVote(v.talarico_vote)}</div>
      </article>`;
  }).join('');
}

['input','change'].forEach(evt=>{
  [voteEls.search,voteEls.session,voteEls.category,voteEls.value,voteEls.keyOnly].forEach(el=>{
    el?.addEventListener(evt,renderVotes);
  });
});

async function loadVotes(){
  if(!voteEls.results) return;
  try{
    const res=await fetch('data/talarico-votes.json',{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    voteData=await res.json();
    fillFilters();
    renderVotes();
  }catch(err){
    voteEls.status.textContent='Voting-data file could not be loaded.';
    voteEls.results.innerHTML=`
      <div class="voteEmpty">
        <strong>Could not load <code>data/talarico-votes.json</code>.</strong><br>
        Confirm the file is committed at that exact path and that the filename capitalization matches. Error: ${escapeHtml(err.message)}
      </div>`;
    console.error('Voting data load failed:',err);
  }
}

loadVotes();
