// ---------- Durum ----------
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let balance = 1000;
let deck = [];
let bets = { main: 0, pp: 0, tp: 0 };
let dealerHand = [];
let playerHands = []; // split desteği için dizi
let activeHand = 0;
let inRound = false;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const balanceEl = $("balance");
const messageEl = $("message");
const dealerCardsEl = $("dealer-cards");
const playerCardsEl = $("player-cards");
const dealerScoreEl = $("dealer-score");
const playerScoreEl = $("player-score");

const playBtn = $("play-btn");
const hitBtn = $("hit-btn");
const standBtn = $("stand-btn");
const doubleBtn = $("double-btn");
const splitBtn = $("split-btn");

// ---------- Deste ----------
function buildDeck() {
  deck = [];
  for (let d = 0; d < 6; d++) { // 6 desteli ayakkabı
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push({ rank: r, suit: s });
      }
    }
  }
  // Fisher-Yates karıştırma
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function draw() {
  if (deck.length < 20) buildDeck();
  return deck.pop();
}

// ---------- Kart değerleri ----------
function cardValue(rank) {
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handScore(hand) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handScore(hand) === 21;
}

function isRed(suit) {
  return suit === "♥" || suit === "♦";
}

// ---------- Render ----------
function cardHTML(card, hidden = false) {
  if (hidden) return `<div class="card back"></div>`;
  const red = isRed(card.suit) ? "red" : "";
  return `
    <div class="card ${red}">
      <div class="rank-top">${card.rank}${card.suit}</div>
      <div class="suit-mid">${card.suit}</div>
      <div class="rank-bot">${card.rank}${card.suit}</div>
    </div>`;
}

function renderDealer(hideHole) {
  dealerCardsEl.innerHTML = dealerHand
    .map((c, i) => cardHTML(c, hideHole && i === 1))
    .join("");
  dealerScoreEl.textContent = hideHole
    ? cardValue(dealerHand[0].rank)
    : handScore(dealerHand);
}

function renderPlayer() {
  // Birden fazla el varsa hepsini göster, aktif olanı işaretle
  playerCardsEl.innerHTML = playerHands
    .map((h, idx) => {
      const cards = h.cards.map((c) => cardHTML(c)).join("");
      const active = idx === activeHand && playerHands.length > 1 ? "outline:2px solid #ffd700;border-radius:10px;" : "";
      const tag = playerHands.length > 1 ? `<div style="font-size:.7rem;opacity:.8">El ${idx + 1} (${h.bet}₺) ${h.done ? "✓" : ""}</div>` : "";
      return `<div style="${active}padding:4px;display:flex;flex-direction:column;gap:4px"><div style="display:flex;gap:8px;flex-wrap:wrap">${cards}</div>${tag}</div>`;
    })
    .join("");
  const cur = playerHands[activeHand];
  playerScoreEl.textContent = cur ? handScore(cur.cards) : "";
}

function setBalance(v) {
  balance = v;
  balanceEl.textContent = balance;
}

function msg(text) {
  messageEl.textContent = text;
}

// ---------- Bahis ----------
function renderBets() {
  $("main-bet").textContent = bets.main;
  $("pp-bet").textContent = bets.pp;
  $("tp-bet").textContent = bets.tp;
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (inRound) return;
    const amount = parseInt(chip.dataset.amount, 10);
    const target = $("bet-target").value;
    if (amount > balance - totalBet()) {
      msg("Yetersiz bakiye!");
      return;
    }
    bets[target] += amount;
    renderBets();
  });
});

document.querySelectorAll(".clear-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (inRound) return;
    bets[btn.dataset.bet] = 0;
    renderBets();
  });
});

function totalBet() {
  return bets.main + bets.pp + bets.tp;
}

// ---------- Side bet değerlendirme ----------
function rankIndex(rank) {
  return RANKS.indexOf(rank);
}

function evaluatePerfectPairs(c1, c2) {
  if (c1.rank !== c2.rank) return { win: 0, label: null };
  if (c1.suit === c2.suit) return { win: bets.pp * 25, label: "Perfect Pair 25:1" };
  if (isRed(c1.suit) === isRed(c2.suit)) return { win: bets.pp * 12, label: "Renkli Çift 12:1" };
  return { win: bets.pp * 6, label: "Karışık Çift 6:1" };
}

function evaluate21plus3(c1, c2, dealerUp) {
  const cards = [c1, c2, dealerUp];
  const suits = cards.map((c) => c.suit);
  const ranks = cards.map((c) => c.rank).sort((a, b) => rankIndex(a) - rankIndex(b));
  const sameSuit = suits.every((s) => s === suits[0]);
  const sameRank = ranks.every((r) => r === ranks[0]);

  // Sıralı kontrolü (A-2-3 ve Q-K-A dahil)
  const idxs = cards.map((c) => rankIndex(c.rank)).sort((a, b) => a - b);
  let straight = idxs[1] === idxs[0] + 1 && idxs[2] === idxs[1] + 1;
  // A,2,3 -> A=0; özel A,K,Q sırası
  const set = new Set(cards.map((c) => c.rank));
  if (set.has("A") && set.has("K") && set.has("Q")) straight = true;

  if (sameRank && sameSuit) return { win: bets.tp * 100, label: "Suited Trips 100:1" };
  if (straight && sameSuit) return { win: bets.tp * 40, label: "Straight Flush 40:1" };
  if (sameRank) return { win: bets.tp * 30, label: "Three of a Kind 30:1" };
  if (straight) return { win: bets.tp * 10, label: "Straight 10:1" };
  if (sameSuit) return { win: bets.tp * 5, label: "Flush 5:1" };
  return { win: 0, label: null };
}

function settleSideBets() {
  const notes = [];
  const c1 = playerHands[0].cards[0];
  const c2 = playerHands[0].cards[1];
  if (bets.pp > 0) {
    const r = evaluatePerfectPairs(c1, c2);
    if (r.win > 0) {
      setBalance(balance + r.win + bets.pp); // kazanç + bahsi geri
      notes.push("PP: " + r.label);
    } else {
      notes.push("PP kaybetti");
    }
  }
  if (bets.tp > 0) {
    const r = evaluate21plus3(c1, c2, dealerHand[0]);
    if (r.win > 0) {
      setBalance(balance + r.win + bets.tp);
      notes.push("21+3: " + r.label);
    } else {
      notes.push("21+3 kaybetti");
    }
  }
  return notes;
}

// ---------- Oyun akışı ----------
playBtn.addEventListener("click", startRound);

function startRound() {
  if (inRound) return;
  if (bets.main <= 0) {
    msg("Önce Ana Bahis koymalısın!");
    return;
  }
  if (totalBet() > balance) {
    msg("Yetersiz bakiye!");
    return;
  }

  inRound = true;
  setBalance(balance - totalBet()); // bahisler çekilir
  if (deck.length < 60) buildDeck();

  dealerHand = [draw(), draw()];
  playerHands = [{ cards: [draw(), draw()], bet: bets.main, done: false, doubled: false }];
  activeHand = 0;

  renderDealer(true);
  renderPlayer();

  // Side bet'leri hemen değerlendir
  const sideNotes = settleSideBets();

  // Doğal blackjack kontrolü
  const playerBJ = isBlackjack(playerHands[0].cards);
  const dealerBJ = isBlackjack(dealerHand);

  if (playerBJ || dealerBJ) {
    finishRound(sideNotes);
    return;
  }

  msg(sideNotes.length ? sideNotes.join(" | ") : "Senin sıran.");
  updateControls();
}

function updateControls() {
  const hand = playerHands[activeHand];
  const canAct = inRound && hand && !hand.done;
  playBtn.disabled = inRound;
  hitBtn.disabled = !canAct;
  standBtn.disabled = !canAct;
  // Double sadece ilk 2 kartta ve bakiye yeterliyse
  doubleBtn.disabled = !(canAct && hand.cards.length === 2 && balance >= hand.bet);
  // Split: ilk 2 kart aynı değerde, bakiye yeterli, henüz split edilmemiş çok el sınırı
  const canSplit =
    canAct &&
    hand.cards.length === 2 &&
    cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank) &&
    balance >= hand.bet &&
    playerHands.length < 4;
  splitBtn.disabled = !canSplit;
}

hitBtn.addEventListener("click", () => {
  const hand = playerHands[activeHand];
  hand.cards.push(draw());
  renderPlayer();
  if (handScore(hand.cards) >= 21) {
    hand.done = true;
    nextHandOrDealer();
  } else {
    updateControls();
  }
});

standBtn.addEventListener("click", () => {
  playerHands[activeHand].done = true;
  nextHandOrDealer();
});

doubleBtn.addEventListener("click", () => {
  const hand = playerHands[activeHand];
  setBalance(balance - hand.bet);
  hand.bet *= 2;
  hand.doubled = true;
  hand.cards.push(draw());
  hand.done = true;
  renderPlayer();
  nextHandOrDealer();
});

splitBtn.addEventListener("click", () => {
  const hand = playerHands[activeHand];
  setBalance(balance - hand.bet);
  const moved = hand.cards.pop();
  const newHand = { cards: [moved, draw()], bet: hand.bet, done: false, doubled: false };
  hand.cards.push(draw());
  playerHands.splice(activeHand + 1, 0, newHand);
  renderPlayer();
  updateControls();
});

function nextHandOrDealer() {
  // Sonraki bitmemiş ele geç
  const next = playerHands.findIndex((h, i) => i > activeHand && !h.done);
  if (next !== -1) {
    activeHand = next;
    renderPlayer();
    updateControls();
    msg("El " + (activeHand + 1) + " oynanıyor.");
    return;
  }
  dealerPlay();
}

function dealerPlay() {
  renderDealer(false);
  // En az bir el bust olmadıysa krupiye oynar
  const anyAlive = playerHands.some((h) => handScore(h.cards) <= 21);
  if (anyAlive) {
    while (handScore(dealerHand) < 17) {
      dealerHand.push(draw());
    }
  }
  renderDealer(false);
  finishRound([]);
}

function finishRound(sideNotes) {
  inRound = false;
  renderDealer(false);

  const dealerTotal = handScore(dealerHand);
  const dealerBJ = isBlackjack(dealerHand);
  const results = [];

  playerHands.forEach((hand, idx) => {
    const pTotal = handScore(hand.cards);
    const pBJ = isBlackjack(hand.cards) && playerHands.length === 1;
    const label = playerHands.length > 1 ? `El ${idx + 1}: ` : "";

    if (pBJ && dealerBJ) {
      setBalance(balance + hand.bet); // push
      results.push(label + "İkisi de Blackjack — Push");
    } else if (pBJ) {
      const win = Math.floor(hand.bet * 1.5);
      setBalance(balance + hand.bet + win); // 3:2
      results.push(label + "BLACKJACK! +" + win);
    } else if (dealerBJ) {
      results.push(label + "Krupiye Blackjack — kayıp");
    } else if (pTotal > 21) {
      results.push(label + "Battın (" + pTotal + ")");
    } else if (dealerTotal > 21) {
      setBalance(balance + hand.bet * 2);
      results.push(label + "Krupiye battı — kazandın! +" + hand.bet);
    } else if (pTotal > dealerTotal) {
      setBalance(balance + hand.bet * 2);
      results.push(label + "Kazandın! +" + hand.bet);
    } else if (pTotal < dealerTotal) {
      results.push(label + "Kaybettin (" + pTotal + " vs " + dealerTotal + ")");
    } else {
      setBalance(balance + hand.bet); // push
      results.push(label + "Berabere (Push)");
    }
  });

  const allNotes = [...(sideNotes || []), ...results];
  msg(allNotes.join(" | "));

  // Bahisleri sıfırla, kontrolleri resetle
  bets = { main: 0, pp: 0, tp: 0 };
  renderBets();
  resetControls();

  if (balance <= 0) {
    msg("Bakiyen bitti! Sayfayı yenile (1000₺ ile başla).");
  }
}

function resetControls() {
  playBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  doubleBtn.disabled = true;
  splitBtn.disabled = true;
}

// ---------- Başlangıç ----------
buildDeck();
renderBets();
setBalance(1000);
resetControls();
