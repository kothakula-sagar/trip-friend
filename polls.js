export function setupPolls({subscribe,write,vote,identity}) {
  const form = document.getElementById('poll-form');
  const list = document.getElementById('poll-list');
  const status = document.getElementById('poll-status');
  let trip, unsubscribe, votes = [], generation = 0;
  function clear() { unsubscribe?.(); votes.forEach(stop => stop()); votes = []; }
  form.onsubmit = async event => {
    event.preventDefault();
    if (!trip?.admin || trip.closed) return;
    const fields = new FormData(form);
    const question = fields.get('question').trim();
    const options = fields.get('options').split('\n').map(text => text.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 5 || new Set(options).size !== options.length || options.some(text => text.length > 80)) {
      status.textContent = 'Add 2 to 5 different options, one per line.'; return;
    }
    const active = generation;
    const button = form.querySelector('button');
    button.disabled = true;
    status.textContent = 'Saving poll…';
    try {
      await write(trip.id,'polls',{question,options,authorUid:identity().uid});
      if (active === generation) { form.reset(); status.textContent = 'Poll created.'; }
    } catch { if (active === generation) status.textContent = 'Could not create this poll. Check your connection and published rules.'; }
    finally { button.disabled = false; }
  };
  return value => {
    if (value?.id === trip?.id && value?.closed === trip?.closed) { trip = value; return; }
    clear(); generation++; trip = value;
    list.replaceChildren(); status.textContent = '';
    form.hidden = !trip?.admin || trip.closed;
    if (!trip) return;
    const active = generation;
    unsubscribe = subscribe(trip.id,'polls','createdAt','desc',items => {
      if (active !== generation) return;
      votes.forEach(stop => stop()); votes = [];
      list.replaceChildren(...items.map(poll => {
        const card = document.createElement('article'); card.className = 'poll-card glass';
        const title = document.createElement('h4'); title.textContent = poll.question;
        const tally = document.createElement('p'); tally.setAttribute('aria-live','polite');
        card.append(title,tally);
        const buttons = poll.options.map((text,index) => {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'outline';
          button.textContent = text; button.disabled = trip.closed;
          button.onclick = async () => {
            buttons.forEach(item => { item.disabled = true; });
            try { await vote(trip.id,poll.id,index); }
            catch { tally.textContent = 'Vote could not be saved. Try again.'; }
            finally { if (active === generation) buttons.forEach(item => { item.disabled = trip.closed; }); }
          };
          card.append(button); return button;
        });
        votes.push(subscribe(trip.id,'polls/'+poll.id+'/votes','updatedAt','desc',ballots => {
          if (active !== generation) return;
          const confirmed = ballots.filter(ballot => !ballot.pending);
          const mine = confirmed.find(ballot => ballot.id === identity()?.uid);
          const count = poll.options.map((_,index) => confirmed.filter(ballot => ballot.option === index).length);
          buttons.forEach((button,index) => {
            button.textContent = poll.options[index]+' · '+count[index];
            button.setAttribute('aria-pressed',String(mine?.option === index));
          });
          tally.textContent = confirmed.length+' vote'+(confirmed.length === 1 ? '' : 's')+' · You can change your vote';
        },() => { tally.textContent = 'Could not load votes.'; }));
        return card;
      }));
      if (!items.length) list.textContent = 'No polls yet. Your trip admin can ask the crew a question.';
    },() => { status.textContent = 'Could not load polls. Reopen this trip to retry.'; });
  };
}
