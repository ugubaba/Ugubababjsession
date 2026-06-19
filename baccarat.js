// Baccarat — kendi kapsamında, blackjack ile global çakışma olmasın diye IIFE.
(function () {
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  let balance = 1000;
  let deck = [];
  let bets = { player: 0, banker: 0, tie: 0, ppair: 0, bpair: 0 };
  let inRound = false;

  const $ = (id) => document.getElementById(id);
  const balanceEl = $("b-balance");
  const messageEl = $("b-message");
  const playerCardsEl = $("bplayer-cards");
  const bankerCardsEl = $("banker-cards");
  const playerScoreEl = $("bplayer-score");
  const bankerScoreEl = $("banker-score");
  const playBtn = $("b-play-btn");

  function buildDeck() {
    deck = [];
    for (let d = 0; d < 8; d++) { // 8 desteli ayakkabı (baccarat standardı)
      for (const s of SUITS) {
        for (const r of RANKS) {
          deck.push({ rank: r, suit: s });
        }
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function draw() {
    if (deck.length < 10) buildDeck();
    return deck.pop();
  }

  function cardValue(rank) {
    if (rank === "A") return 1;
    if (["10", "J", "Q", "K"].includes(rank)) return 0;
    return parseInt(rank, 10);
  }

  function handTotal(hand) {
    let t = 0;
    for (const c of hand) t += cardValue(c.rank);
    return t % 10;
  }

  function isRed(suit) {
    return suit === "♥" || suit === "♦";
  }

  function cardHTML(card) {
    const red = isRed(card.suit) ? "red" : "";
    return `
      <div class="card ${red}">
        <div class="rank-top">${card.rank}${card.suit}</div>
        <div class="suit-mid">${card.suit}</div>
        <div class="rank-bot">${card.rank}${card.suit}</div>
      </div>`;
  }

  let playerHand = [];
  let bankerHand = [];

  function render() {
    playerCardsEl.innerHTML = playerHand.map(cardHTML).join("");
    bankerCardsEl.innerHTML = bankerHand.map(cardHTML).join("");
    playerScoreEl.textContent = playerHand.length ? handTotal(playerHand) : "";
    bankerScoreEl.textContent = bankerHand.length ? handTotal(bankerHand) : "";
  }

  function setBalance(v) {
    balance = v;
    balanceEl.textContent = balance;
  }

  function msg(t) {
    messageEl.textContent = t;
  }

  function totalBet() {
    return bets.player + bets.banker + bets.tie + bets.ppair + bets.bpair;
  }

  function renderBets() {
    $("bp-bet").textContent = bets.player;
    $("bb-bet").textContent = bets.banker;
    $("bt-bet").textContent = bets.tie;
    $("bpp-bet").textContent = bets.ppair;
    $("bbp-bet").textContent = bets.bpair;
  }

  // Çip & temizleme — yalnızca baccarat alanındaki butonlar
  document.querySelectorAll(".b-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (inRound) return;
      const amount = parseInt(chip.dataset.amount, 10);
      const target = $("b-bet-target").value;
      if (amount > balance - totalBet()) {
        msg("Yetersiz bakiye!");
        return;
      }
      bets[target] += amount;
      Sound.chip();
      renderBets();
    });
  });

  document.querySelectorAll("#view-baccarat .clear-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (inRound) return;
      bets[btn.dataset.bet] = 0;
      renderBets();
    });
  });

  // Bahis kutusuna tıklayınca seçili hedefi değiştir (kolaylık)
  document.querySelectorAll("#view-baccarat .bet-box").forEach((box) => {
    box.addEventListener("click", (e) => {
      if (e.target.classList.contains("clear-btn")) return;
      if (box.dataset.bet) $("b-bet-target").value = box.dataset.bet;
    });
  });

  playBtn.addEventListener("click", startRound);

  function startRound() {
    if (inRound) return;
    if (bets.player + bets.banker + bets.tie + bets.ppair + bets.bpair <= 0) {
      msg("Önce bahis koymalısın!");
      return;
    }
    if (totalBet() > balance) {
      msg("Yetersiz bakiye!");
      return;
    }

    inRound = true;
    playBtn.disabled = true;
    setBalance(balance - totalBet());
    if (deck.length < 30) buildDeck();

    // İlk dağıtım: P, B, P, B
    playerHand = [draw()];
    bankerHand = [draw()];
    playerHand.push(draw());
    bankerHand.push(draw());
    Sound.deal();
    render();

    let pTotal = handTotal(playerHand);
    let bTotal = handTotal(bankerHand);

    // Natural kontrolü
    if (pTotal >= 8 || bTotal >= 8) {
      finish();
      return;
    }

    // Player kuralı
    let playerThird = null;
    if (pTotal <= 5) {
      playerThird = draw();
      playerHand.push(playerThird);
    }

    // Banker kuralı
    bTotal = handTotal(bankerHand);
    if (playerThird === null) {
      // Player çekmediyse: banker 0-5 çeker
      if (bTotal <= 5) bankerHand.push(draw());
    } else {
      const p3 = cardValue(playerThird.rank);
      let bankerDraws = false;
      if (bTotal <= 2) bankerDraws = true;
      else if (bTotal === 3) bankerDraws = p3 !== 8;
      else if (bTotal === 4) bankerDraws = p3 >= 2 && p3 <= 7;
      else if (bTotal === 5) bankerDraws = p3 >= 4 && p3 <= 7;
      else if (bTotal === 6) bankerDraws = p3 === 6 || p3 === 7;
      // bTotal === 7 -> stand
      if (bankerDraws) bankerHand.push(draw());
    }

    setTimeout(() => {
      Sound.deal();
      render();
      finish();
    }, 350);
  }

  function isPair(hand) {
    return hand.length >= 2 && hand[0].rank === hand[1].rank;
  }

  function finish() {
    render();
    const p = handTotal(playerHand);
    const b = handTotal(bankerHand);
    const notes = [];
    const balanceBefore = balance;

    // Pair side bet'leri (ana sonuçtan bağımsız)
    if (bets.ppair > 0) {
      if (isPair(playerHand)) {
        setBalance(balance + bets.ppair * 11 + bets.ppair);
        notes.push("Player Pair! +" + bets.ppair * 11);
      } else notes.push("Player Pair kaybetti");
    }
    if (bets.bpair > 0) {
      if (isPair(bankerHand)) {
        setBalance(balance + bets.bpair * 11 + bets.bpair);
        notes.push("Banker Pair! +" + bets.bpair * 11);
      } else notes.push("Banker Pair kaybetti");
    }

    // Ana sonuç
    let outcome;
    if (p > b) outcome = "player";
    else if (b > p) outcome = "banker";
    else outcome = "tie";

    notes.push(`Player ${p} — Banker ${b}: ` + outcome.toUpperCase());

    if (outcome === "tie") {
      // Player & Banker bahisleri push (iade), Tie kazanır
      if (bets.player > 0) setBalance(balance + bets.player);
      if (bets.banker > 0) setBalance(balance + bets.banker);
      if (bets.tie > 0) {
        setBalance(balance + bets.tie * 8 + bets.tie);
        notes.push("Tie 8:1 kazandı!");
      }
    } else if (outcome === "player") {
      if (bets.player > 0) {
        setBalance(balance + bets.player * 2);
        notes.push("Player bahsi kazandı +" + bets.player);
      }
    } else {
      if (bets.banker > 0) {
        const win = Math.floor(bets.banker * 0.95);
        setBalance(balance + bets.banker + win); // %5 komisyon
        notes.push("Banker bahsi kazandı +" + win);
      }
    }

    msg(notes.join(" | "));

    if (balance > balanceBefore) Sound.win();
    else if (balance === balanceBefore) Sound.lose();
    else Sound.lose();

    bets = { player: 0, banker: 0, tie: 0, ppair: 0, bpair: 0 };
    renderBets();
    inRound = false;
    playBtn.disabled = false;

    if (balance <= 0) {
      msg("Bakiyen bitti! Sayfayı yenile.");
    }
  }

  // Başlangıç
  buildDeck();
  renderBets();
  setBalance(1000);
})();
