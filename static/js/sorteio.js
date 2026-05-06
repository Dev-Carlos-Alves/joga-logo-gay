const Sorteio = {
    /**
     * Sorteia os jogadores em times balanceados baseado na habilidade.
     * @param {Array} players - Array de jogadores [{id, name, skill, photo}]
     * @param {Number} numTeams - Quantidade de times
     * @param {Number} playersPerTeam - Jogadores por time
     * @returns {Array} - Array de times [{players: [], skillSum: 0}]
     */
    balancear: function(players, numTeams, playersPerTeam) {
        // Validação básica
        if (players.length < numTeams * playersPerTeam) {
            throw new Error('Jogadores insuficientes para preencher os times.');
        }

        // Ordenar jogadores por habilidade (decrescente). 
        // Em caso de empate na habilidade, embaralha aleatoriamente.
        let pool = [...players].sort((a, b) => {
            if (b.skill === a.skill) return Math.random() - 0.5;
            return b.skill - a.skill;
        });

        // Inicializar os times
        let teams = Array.from({length: numTeams}, (_, i) => ({ 
            id: i + 1,
            name: `Time ${i + 1}`,
            players: [], 
            skillSum: 0 
        }));

        // Distribuir jogadores
        for (let player of pool) {
            // Filtrar apenas times que ainda não estão cheios
            let availableTeams = teams.filter(t => t.players.length < playersPerTeam);
            
            if (availableTeams.length === 0) {
                // Todos os times já estão cheios, ignora os jogadores restantes (se houver sobrando)
                break;
            }

            // Ordenar os times disponíveis pela soma de habilidade (crescente)
            availableTeams.sort((a, b) => a.skillSum - b.skillSum);

            // Pegar o time com a menor soma. 
            // Para adicionar um fator sorte e evitar times idênticos sempre, 
            // se houver empate na menor soma, escolhemos um aleatoriamente entre os empatados.
            let minSum = availableTeams[0].skillSum;
            let candidateTeams = availableTeams.filter(t => t.skillSum === minSum);
            let chosenTeam = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];

            chosenTeam.players.push(player);
            chosenTeam.skillSum += player.skill;
        }

        return teams;
    },

    /**
     * Gera os jogos da Fase Classificatória (Todos contra Todos, 2 turnos)
     */
    gerarFaseClassificatoria: function(teams) {
        let matches = [];
        let matchId = 1;

        // Turno e Returno (2 rounds)
        for (let round = 1; round <= 2; round++) {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    matches.push({
                        id: `match-group-${Date.now()}-${matchId++}`,
                        round: round,
                        team1: teams[i],
                        team2: teams[j],
                        score1: null,
                        score2: null,
                        played: false
                    });
                }
            }
        }
        
        // Embaralha as partidas para não jogar sempre os mesmos times em sequência
        return matches.sort(() => Math.random() - 0.5);
    },

    /**
     * Calcula a classificação atual baseada nos jogos realizados
     */
    calcularClassificacao: function(matches, teams) {
        let table = teams.map(t => ({
            team: t,
            played: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDifference: 0
        }));

        matches.forEach(m => {
            if (m.played) {
                let t1 = table.find(x => x.team.id === m.team1.id);
                let t2 = table.find(x => x.team.id === m.team2.id);

                t1.played++; 
                t2.played++;
                t1.pointsFor += m.score1; 
                t1.pointsAgainst += m.score2;
                t2.pointsFor += m.score2; 
                t2.pointsAgainst += m.score1;

                if (m.score1 > m.score2) { t1.wins++; t2.losses++; }
                else if (m.score2 > m.score1) { t2.wins++; t1.losses++; }
            }
        });

        table.forEach(t => t.pointDifference = t.pointsFor - t.pointsAgainst);

        // Ordem: 1º Vitórias, 2º Pontos Pró, 3º Saldo de Pontos
        table.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
            return b.pointDifference - a.pointDifference;
        });

        return table;
    },

    /**
     * Gera o chaveamento das Semifinais com os 4 melhores
     */
    gerarSemifinais: function(tabela) {
        if (tabela.length < 4) throw new Error("São necessários pelo menos 4 times para formar semifinais.");
        
        let t1 = tabela[0].team;
        let t2 = tabela[1].team;
        let t3 = tabela[2].team;
        let t4 = tabela[3].team;

        let semi1 = {
            id: `match-semi-1`,
            phase: 'Semifinal',
            label: '1º x 4º',
            team1: t1,
            team2: t4,
            score1: null,
            score2: null,
            winner: null
        };

        let semi2 = {
            id: `match-semi-2`,
            phase: 'Semifinal',
            label: '2º x 3º',
            team1: t2,
            team2: t3,
            score1: null,
            score2: null,
            winner: null
        };

        let finalMatch = {
            id: `match-final`,
            phase: 'Final',
            label: 'Vencedores',
            team1: null, 
            team2: null,
            score1: null,
            score2: null,
            winner: null
        };

        return [semi1, semi2, finalMatch];
    }
};
