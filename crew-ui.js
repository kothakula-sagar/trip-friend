export function renderChat(list, messages, profiles, user) {
  const fragment = document.createDocumentFragment();
  let previousDay, previousAuthor;
  for (const message of [...messages].reverse()) {
    const date = message.createdAt?.toDate();
    const day = date?.toLocaleDateString(undefined,{dateStyle:'medium'});
    if (day && day !== previousDay) {
      const divider = document.createElement('li');
      divider.className = 'chat-day';
      divider.textContent = day;
      fragment.append(divider);
      previousDay = day;
      previousAuthor = undefined;
    }
    const mine = message.authorUid === user?.uid;
    const name = profiles.get(message.authorUid)?.name || (mine ? user.displayName || user.email?.split('@')[0] : null) || 'Trip member';
    const item = document.createElement('li');
    item.className = 'chat-row' + (mine ? ' mine' : '') + (previousAuthor === message.authorUid ? ' grouped' : '');
    const avatar = document.createElement('span');
    avatar.className = 'chat-avatar';
    avatar.textContent = Array.from(name)[0].toUpperCase();
    avatar.setAttribute('aria-hidden','true');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    const author = document.createElement('strong');
    author.textContent = name;
    const text = document.createElement('div');
    text.textContent = message.text;
    const meta = document.createElement('small');
    meta.textContent = message.pending ? 'Sending…' : [
      date?.toLocaleTimeString(undefined,{timeStyle:'short'}), mine ? 'Sent' : ''
    ].filter(Boolean).join(' · ');
    bubble.append(author,text,meta);
    item.append(avatar,bubble);
    fragment.append(item);
    previousAuthor = message.authorUid;
  }
  list.replaceChildren(fragment);
  if (!messages.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No messages yet. Say hello to your crew.';
    list.append(empty);
  }
}
