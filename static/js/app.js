const app = {
    state: {
        players: [],
        selectedPlayers: [],
        teams: [],
        matches: [],
        knockoutMatches: [],
        leaderboard: [],
        currentPhase: 'group',
        photoBase64: null,
        currentSkill: 3,
        currentMatchId: null,
        batchDeleteMode: false,
        playersToDelete: []
    },

    async init() {
        this.bindEvents();
        await this.loadPlayers();
        this.updateSetupCounts();
    },

    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
        
        if (viewId === 'setup') {
            this.renderPlayerSelection();
            this.updateSetupCounts();
        }
    },

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        if (modalId === 'add-player-modal') {
            document.getElementById('add-player-form').reset();
            document.getElementById('player-id').value = '';
            document.getElementById('player-modal-title').innerText = 'Novo Jogador';
            this.state.photoBase64 = null;
            document.getElementById('photo-preview-container').style.display = 'none';
            document.getElementById('photo-preview-label').style.backgroundImage = 'none';
            this.setSkill(3);
            lucide.createIcons();
        } else if (modalId === 'edit-team-modal') {
            document.getElementById('edit-team-form').reset();
            document.getElementById('edit-team-id').value = '';
            this.state.photoBase64 = null;
            document.getElementById('team-photo-preview-container').style.display = 'none';
            document.getElementById('team-photo-preview-label').style.backgroundImage = 'none';
        }
    },

    bindEvents() {
        // Photo Upload Handlers (Players and Teams)
        const handlePhotoUpload = (e, prefix) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.state.photoBase64 = event.target.result;
                    document.getElementById(`${prefix}-photo-preview-container`).style.display = 'flex';
                    const label = document.getElementById(`${prefix}-photo-preview-label`);
                    label.style.backgroundImage = `url(${this.state.photoBase64})`;
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('player-photo-camera').addEventListener('change', (e) => handlePhotoUpload(e, ''));
        document.getElementById('player-photo-gallery').addEventListener('change', (e) => handlePhotoUpload(e, ''));
        document.getElementById('team-photo-camera').addEventListener('change', (e) => handlePhotoUpload(e, 'team'));
        document.getElementById('team-photo-gallery').addEventListener('change', (e) => handlePhotoUpload(e, 'team'));

        // Stars Rating
        const stars = document.querySelectorAll('#star-rating-input .star-btn');
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const val = parseInt(e.currentTarget.dataset.value);
                this.setSkill(val);
            });
            star.addEventListener('mouseover', (e) => {
                const val = parseInt(e.currentTarget.dataset.value);
                stars.forEach(s => {
                    if (parseInt(s.dataset.value) <= val) s.classList.add('active-hover');
                    else s.classList.remove('active-hover');
                });
            });
            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('active-hover'));
            });
        });

        // Add/Edit Player Form
        document.getElementById('add-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('player-name').value;
            const id = document.getElementById('player-id').value;
            
            const playerData = {
                name: name,
                skill: this.state.currentSkill,
                photo: this.state.photoBase64 || '/static/images/vale.jpg'
            };

            if (id) {
                playerData.id = parseInt(id);
                await db.updatePlayer(playerData);
            } else {
                await db.addPlayer(playerData);
            }
            
            this.closeModal('add-player-modal');
            await this.loadPlayers();
        });

        // Setup Form
        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sortear();
        });

        // Edit Team Form
        document.getElementById('edit-team-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('edit-team-id').value);
            const team = this.state.teams.find(t => t.id === id);
            if (team) {
                team.customName = document.getElementById('team-custom-name').value;
                if (this.state.photoBase64) team.photo = this.state.photoBase64;
                this.renderTeams();
            }
            this.closeModal('edit-team-modal');
        });

        // Match Form
        document.getElementById('match-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMatchResult();
        });
    },

    setSkill(val) {
        this.state.currentSkill = val;
        document.getElementById('player-skill').value = val;
        
        const labels = ["Iniciante", "Básico", "Intermediário", "Avançado", "Profissional", "Lenda"];
        document.getElementById('skill-label').innerText = labels[val];

        const stars = document.querySelectorAll('#star-rating-input .star-btn');
        stars.forEach(s => {
            if (parseInt(s.dataset.value) <= val) s.classList.add('active');
            else s.classList.remove('active');
        });
    },

    async loadPlayers() {
        try {
            // Load fixed players from JSON
            const res = await fetch('/static/json/teste_jogadores.json');
            let fixedPlayers = [];
            if (res.ok) {
                fixedPlayers = await res.json();
                fixedPlayers = fixedPlayers.map(p => ({ ...p, isFixed: true }));
            }
            
            // Load custom players from IndexedDB
            let customPlayers = await db.getAllPlayers();
            
            // Combine both
            this.state.players = [...fixedPlayers, ...customPlayers];
        } catch (e) {
            console.error("Erro ao carregar jogadores fixos:", e);
            this.state.players = await db.getAllPlayers();
        }
        
        this.renderPlayersGrid();
        this.renderPlayerSelection();
    },

    renderPlayersGrid() {
        const grid = document.getElementById('players-list');
        if (this.state.players.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="users"></i>
                    <p>Nenhum jogador cadastrado ainda.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = '';
        this.state.players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${this.state.batchDeleteMode ? 'batch-mode' : ''} ${this.state.playersToDelete.includes(player.id) ? 'selected-for-deletion' : ''}`;
            
            if (this.state.batchDeleteMode) {
                card.onclick = () => this.togglePlayerDelete(player.id);
            } else {
                card.onclick = null;
            }
            
            let starsHtml = '';
            for(let i=0; i<5; i++) {
                if (i < player.skill) starsHtml += '<i data-lucide="star" style="fill: var(--warning)"></i>';
                else starsHtml += '<i data-lucide="star"></i>';
            }

            card.innerHTML = `
                ${!player.isFixed ? `<input type="checkbox" class="player-card-checkbox" ${this.state.playersToDelete.includes(player.id) ? 'checked' : ''} onclick="event.stopPropagation(); app.togglePlayerDelete(${player.id})">` : ''}
                <div class="player-card-actions">
                    ${!player.isFixed ? `
                        <button class="edit-player-btn" onclick="app.editPlayer(${player.id})" title="Editar"><i data-lucide="edit-2"></i></button>
                        <button class="delete-player-btn" onclick="app.deletePlayer(${player.id})" title="Excluir"><i data-lucide="trash-2"></i></button>
                    ` : ''}
                </div>
                <img src="${player.photo}" class="player-card-photo" alt="${player.name}" onerror="this.src='/static/images/vale.jpg'">
                <div class="player-card-name">
                    ${player.name}
                    ${player.isFixed ? '<i data-lucide="lock" style="width: 12px; height: 12px; color: var(--accent); margin-left: 4px;" title="Jogador Fixo"></i>' : ''}
                </div>
                <div class="player-stars">${starsHtml}</div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();
    },

    async deletePlayer(id) {
        if(confirm('Tem certeza que deseja excluir este jogador?')) {
            await db.deletePlayer(id);
            await this.loadPlayers();
        }
    },

    editPlayer(id) {
        const player = this.state.players.find(p => p.id === id);
        if (!player) return;

        document.getElementById('player-id').value = player.id;
        document.getElementById('player-name').value = player.name;
        document.getElementById('player-modal-title').innerText = 'Editar Jogador';
        
        this.setSkill(player.skill);
        
        this.state.photoBase64 = player.photo;
        document.getElementById('photo-preview-container').style.display = 'flex';
        const label = document.getElementById('photo-preview-label');
        label.style.backgroundImage = `url(${this.state.photoBase64})`;

        this.openModal('add-player-modal');
    },

    toggleBatchDelete() {
        this.state.batchDeleteMode = !this.state.batchDeleteMode;
        this.state.playersToDelete = [];
        document.getElementById('btn-delete-selected').style.display = this.state.batchDeleteMode ? 'flex' : 'none';
        this.renderPlayersGrid();
    },

    togglePlayerDelete(id) {
        if (!this.state.batchDeleteMode) return;
        const index = this.state.playersToDelete.indexOf(id);
        if (index > -1) this.state.playersToDelete.splice(index, 1);
        else this.state.playersToDelete.push(id);
        this.renderPlayersGrid();
    },

    async deleteSelectedPlayers() {
        if (this.state.playersToDelete.length === 0) return;
        if (confirm(`Tem certeza que deseja excluir ${this.state.playersToDelete.length} jogadores?`)) {
            for (let id of this.state.playersToDelete) {
                await db.deletePlayer(id);
            }
            this.toggleBatchDelete(); // Exit batch mode
            await this.loadPlayers();
        }
    },



    increment(inputId) {
        const input = document.getElementById(inputId);
        const max = parseInt(input.max);
        if (parseInt(input.value) < max) {
            input.value = parseInt(input.value) + 1;
            this.updateSetupCounts();
        }
    },

    decrement(inputId) {
        const input = document.getElementById(inputId);
        const min = parseInt(input.min);
        if (parseInt(input.value) > min) {
            input.value = parseInt(input.value) - 1;
            this.updateSetupCounts();
        }
    },

    updateSetupCounts() {
        const numTeams = parseInt(document.getElementById('num-teams').value);
        const playersPerTeam = parseInt(document.getElementById('players-per-team').value);
        const required = numTeams * playersPerTeam;
        
        document.getElementById('required-count').innerText = required;
        document.getElementById('selected-count').innerText = this.state.selectedPlayers.length;

        const btnSortear = document.getElementById('btn-sortear');
        if (this.state.selectedPlayers.length === required) {
            btnSortear.disabled = false;
        } else {
            btnSortear.disabled = true;
        }
    },

    renderPlayerSelection() {
        const list = document.getElementById('player-selection-list');
        list.innerHTML = '';
        
        const searchTerm = (document.getElementById('search-players')?.value || '').toLowerCase();
        
        const filteredPlayers = this.state.players.filter(p => 
            p.name.toLowerCase().includes(searchTerm)
        );

        filteredPlayers.forEach(player => {
            const isSelected = this.state.selectedPlayers.some(p => p.id === player.id);
            const item = document.createElement('div');
            item.className = `player-select-item ${isSelected ? 'selected' : ''}`;
            item.onclick = () => this.togglePlayerSelection(player);

            item.innerHTML = `
                <img src="${player.photo}" class="player-select-photo" onerror="this.src='/static/images/vale.jpg'">
                <div class="player-select-info">
                    <div class="player-select-name">${player.name}</div>
                    <div class="player-stars" style="justify-content: flex-start; gap: 2px;">
                        ${'<i data-lucide="star" style="width:12px; fill:var(--warning)"></i>'.repeat(player.skill)}
                    </div>
                </div>
                ${isSelected ? '<i data-lucide="check-circle" style="color: var(--accent)"></i>' : '<i data-lucide="circle"></i>'}
            `;
            list.appendChild(item);
        });
        lucide.createIcons();
    },

    selectAllPlayers() {
        const numTeams = parseInt(document.getElementById('num-teams').value);
        const playersPerTeam = parseInt(document.getElementById('players-per-team').value);
        const required = numTeams * playersPerTeam;

        this.state.selectedPlayers = [];
        
        // Filter players exactly as renderPlayerSelection does to only select visible ones
        const searchTerm = (document.getElementById('search-players')?.value || '').toLowerCase();
        const filteredPlayers = this.state.players.filter(p => 
            p.name.toLowerCase().includes(searchTerm)
        );
        
        for (let i = 0; i < Math.min(filteredPlayers.length, required); i++) {
            this.state.selectedPlayers.push(filteredPlayers[i].id);
        }
        
        this.renderPlayerSelection();
    },

    togglePlayerSelection(player) {
        const playerId = player.id || player;
        const index = this.state.selectedPlayers.indexOf(playerId);
        
        const numTeams = parseInt(document.getElementById('num-teams').value);
        const playersPerTeam = parseInt(document.getElementById('players-per-team').value);
        const required = numTeams * playersPerTeam;

        if (index > -1) {
            this.state.selectedPlayers.splice(index, 1);
        } else {
            if (this.state.selectedPlayers.length >= required) {
                alert(`Você já selecionou os ${required} jogadores necessários!`);
                return;
            }
            this.state.selectedPlayers.push(playerId);
        }
        
        // Re-render item specific icons
        this.renderPlayerSelection();
        this.updateSetupCounts();
    },

    sortear() {
        try {
            const selectedFullPlayers = this.state.players.filter(p => this.state.selectedPlayers.includes(p.id));
            const numTeams = parseInt(document.getElementById('num-teams').value);
            const playersPerTeam = parseInt(document.getElementById('players-per-team').value);
            
            this.state.teams = Sorteio.balancear(selectedFullPlayers, numTeams, playersPerTeam);
            this.renderTeams();
            this.navigate('teams');
        } catch (error) {
            alert(error.message);
        }
    },

    renderTeams() {
        const grid = document.getElementById('teams-list');
        grid.innerHTML = '';
        
        this.state.teams.forEach(team => {
            const card = document.createElement('div');
            card.className = 'team-card';
            
            // Drag and Drop listeners
            card.ondragover = (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
            };
            card.ondragleave = () => card.classList.remove('drag-over');
            card.ondrop = (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                this.handlePlayerDrop(e, team.id);
            };
            
            let playersHtml = team.players.map(p => `
                <div class="team-player-row" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', JSON.stringify({teamId: ${team.id}, playerId: ${p.id}}))">
                    <img src="${p.photo}" onerror="this.src='/static/images/vale.jpg'">
                    <span>${p.name}</span>
                    <span style="color:var(--warning); font-size:0.8rem; margin-left:auto;">
                        ${p.skill} <i data-lucide="star" style="width:12px; display:inline"></i>
                    </span>
                </div>
            `).join('');

            const displayName = team.customName || team.name;

            card.innerHTML = `
                <div class="team-header">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${team.photo ? `<img src="${team.photo}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">` : ''}
                        <span>${displayName}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="team-stars-total">${team.skillSum} <i data-lucide="star"></i></div>
                        <button class="edit-team-btn" onclick="app.editTeam(${team.id})" title="Editar Time"><i data-lucide="edit-2"></i></button>
                    </div>
                </div>
                <div class="team-players">
                    ${playersHtml}
                </div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();
    },

    editTeam(teamId) {
        const team = this.state.teams.find(t => t.id === teamId);
        if (!team) return;

        document.getElementById('edit-team-id').value = team.id;
        document.getElementById('team-custom-name').value = team.customName || '';
        
        if (team.photo) {
            this.state.photoBase64 = team.photo;
            document.getElementById('team-photo-preview-container').style.display = 'flex';
            document.getElementById('team-photo-preview-label').style.backgroundImage = `url(${this.state.photoBase64})`;
        } else {
            this.state.photoBase64 = null;
        }

        this.openModal('edit-team-modal');
    },

    handlePlayerDrop(e, targetTeamId) {
        const dataText = e.dataTransfer.getData('text/plain');
        if (!dataText) return;
        
        try {
            const data = JSON.parse(dataText);
            if (data.teamId === targetTeamId) return; // Same team

            const sourceTeam = this.state.teams.find(t => t.id === data.teamId);
            const targetTeam = this.state.teams.find(t => t.id === targetTeamId);
            
            const playerIndex = sourceTeam.players.findIndex(p => p.id === data.playerId);
            if (playerIndex > -1) {
                const [player] = sourceTeam.players.splice(playerIndex, 1);
                targetTeam.players.push(player);
                
                // Recalculate sums
                sourceTeam.skillSum = sourceTeam.players.reduce((sum, p) => sum + p.skill, 0);
                targetTeam.skillSum = targetTeam.players.reduce((sum, p) => sum + p.skill, 0);
                
                this.renderTeams();
            }
        } catch(err) {
            console.error("Drop error", err);
        }
    },

    startChampionship() {
        this.state.matches = Sorteio.gerarFaseClassificatoria(this.state.teams);
        this.state.currentPhase = 'group';
        this.updateLeaderboard();
        this.renderChampionship();
        this.navigate('bracket');
    },

    updateLeaderboard() {
        this.state.leaderboard = Sorteio.calcularClassificacao(this.state.matches, this.state.teams);
    },

    renderChampionship() {
        if (this.state.currentPhase === 'group') {
            this.renderGroupPhase();
        } else {
            this.renderKnockoutPhase();
        }
    },

    getTeamDisplay(team) {
        if (!team) return { name: 'Vazio', photo: '/static/images/vale.jpg' };
        const displayName = team.customName ? `${team.customName} (${team.name})` : team.name;
        return { name: displayName, photo: team.photo || '/static/images/vale.jpg' };
    },

    renderGroupPhase() {
        const container = document.getElementById('bracket-container');
        container.innerHTML = `
            <div class="championship-layout">
                <div class="leaderboard-section">
                    <h3>Classificação</h3>
                    <div style="overflow-x: auto;">
                        <table class="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Time</th>
                                    <th>J</th>
                                    <th>V</th>
                                    <th>P</th>
                                    <th>S</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.state.leaderboard.map((row, index) => {
                                    const t = this.getTeamDisplay(row.team);
                                    const isQualified = index < 4;
                                    return `
                                        <tr class="${isQualified ? 'qualified' : 'eliminated'}">
                                            <td>${index + 1}º</td>
                                            <td class="team-cell"><img src="${t.photo}"> ${t.name}</td>
                                            <td>${row.played}</td>
                                            <td>${row.wins}</td>
                                            <td>${row.pointsFor}</td>
                                            <td>${row.pointDifference > 0 ? '+' : ''}${row.pointDifference}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <button class="btn btn-primary btn-full" style="margin-top: 1rem;" onclick="app.startKnockoutPhase()">
                        Encerrar Fase e Gerar Semifinais
                    </button>
                </div>

                <div class="matches-section">
                    <h3>Partidas</h3>
                    <div class="matches-list">
                        ${this.state.matches.map(match => {
                            const t1 = this.getTeamDisplay(match.team1);
                            const t2 = this.getTeamDisplay(match.team2);
                            return `
                                <div class="bracket-match ${match.played ? 'played' : ''}" onclick="app.openMatchModal('${match.id}')">
                                    <div class="match-team ${match.played && match.score1 > match.score2 ? 'winner' : ''}">
                                        <div class="match-team-info">
                                            <img src="${t1.photo}" class="match-team-photo">
                                            <span>${t1.name}</span>
                                        </div>
                                        <span>${match.played ? match.score1 : '-'}</span>
                                    </div>
                                    <div class="match-team ${match.played && match.score2 > match.score1 ? 'winner' : ''}">
                                        <div class="match-team-info">
                                            <img src="${t2.photo}" class="match-team-photo">
                                            <span>${t2.name}</span>
                                        </div>
                                        <span>${match.played ? match.score2 : '-'}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    startKnockoutPhase() {
        if (this.state.teams.length < 4) {
            alert('São necessários pelo menos 4 times para formar semifinais.');
            return;
        }
        
        if (!confirm('Atenção: Você está prestes a encerrar a Fase de Grupos. Os 4 primeiros irão para a Semifinal e os demais serão eliminados. Continuar?')) return;

        this.state.knockoutMatches = Sorteio.gerarSemifinais(this.state.leaderboard);
        this.state.currentPhase = 'knockout';
        this.renderChampionship();
    },

    renderKnockoutPhase() {
        const container = document.getElementById('bracket-container');
        container.innerHTML = `
            <div class="knockout-container">
                ${this.state.knockoutMatches.map(match => {
                    const isT1Winner = match.winner && match.winner.id === (match.team1 ? match.team1.id : -1);
                    const isT2Winner = match.winner && match.winner.id === (match.team2 ? match.team2.id : -1);

                    const t1 = this.getTeamDisplay(match.team1);
                    const t2 = this.getTeamDisplay(match.team2);

                    return `
                        <div class="bracket-round">
                            <h4 style="text-align:center; color:var(--text-muted); margin-bottom:1rem;">${match.phase}</h4>
                            <div class="bracket-match" onclick="app.openMatchModal('${match.id}')">
                                <div class="match-team ${isT1Winner ? 'winner' : ''}">
                                    <div class="match-team-info">
                                        ${match.team1 ? `<img src="${t1.photo}" class="match-team-photo">` : ''}
                                        <span>${t1.name}</span>
                                    </div>
                                    <span>${match.score1 !== null ? match.score1 : '-'}</span>
                                </div>
                                <div class="match-team ${isT2Winner ? 'winner' : ''}">
                                    <div class="match-team-info">
                                        ${match.team2 ? `<img src="${t2.photo}" class="match-team-photo">` : ''}
                                        <span>${t2.name}</span>
                                    </div>
                                    <span>${match.score2 !== null ? match.score2 : '-'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    openMatchModal(matchId) {
        let match = this.state.matches.find(m => m.id === matchId) || this.state.knockoutMatches.find(m => m.id === matchId);
        if (!match || (!match.team1 && !match.team2)) return; 
        
        this.state.currentMatchId = matchId;
        document.getElementById('match-team1-name').innerText = this.getTeamDisplay(match.team1).name;
        document.getElementById('match-team2-name').innerText = this.getTeamDisplay(match.team2).name;
        document.getElementById('match-team1-score').value = match.score1 || 0;
        document.getElementById('match-team2-score').value = match.score2 || 0;
        
        this.openModal('match-modal');
    },

    saveMatchResult() {
        const score1 = parseInt(document.getElementById('match-team1-score').value);
        const score2 = parseInt(document.getElementById('match-team2-score').value);
        
        let match = this.state.matches.find(m => m.id === this.state.currentMatchId);
        let isKnockout = false;

        if (!match) {
            match = this.state.knockoutMatches.find(m => m.id === this.state.currentMatchId);
            isKnockout = true;
        }

        match.score1 = score1;
        match.score2 = score2;
        match.played = true;
        
        if (score1 > score2) match.winner = match.team1;
        else if (score2 > score1) match.winner = match.team2;
        else match.winner = null; 
        
        if (!isKnockout) {
            this.updateLeaderboard();
        } else {
            // Propagate winners to the Final match
            if (match.phase === 'Semifinal') {
                const finalMatch = this.state.knockoutMatches.find(m => m.phase === 'Final');
                if (match.id === 'match-semi-1') finalMatch.team1 = match.winner;
                if (match.id === 'match-semi-2') finalMatch.team2 = match.winner;
            }
        }

        this.closeModal('match-modal');
        this.renderChampionship();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker Registrado!', reg))
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }
});
