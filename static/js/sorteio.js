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
        let pool = [];
        let matchId = 1;

        // Gerar todas as partidas possíveis (Turno e Returno)
        for (let round = 1; round <= 2; round++) {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    pool.push({
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

        let orderedMatches = [];
        let consecutive = {};
        let resting = {};
        teams.forEach(t => {
            consecutive[t.id] = 0;
            resting[t.id] = 0;
        });

        while (pool.length > 0) {
            let bestMatchIndex = -1;
            let minPenalty = Infinity;

            for (let k = 0; k < pool.length; k++) {
                let m = pool[k];
                let penalty = 0;

                // Restrição: Um mesmo time não pode jogar mais que DUAS partidas seguidas
                if (consecutive[m.team1.id] >= 2 || consecutive[m.team2.id] >= 2) {
                    penalty += 1000;
                }

                // Restrição: Um mesmo time não pode ficar MAIS que 2 partidas sem jogar
                // Se algum time JÁ descansou 2 partidas e NÃO está nesta partida, ele chegaria a 3
                teams.forEach(t => {
                    if (t.id !== m.team1.id && t.id !== m.team2.id) {
                        if (resting[t.id] >= 2) {
                            penalty += 500; 
                        }
                    }
                });

                // Bônus para quem está descansando há mais tempo (evita chegar no limite)
                penalty -= (resting[m.team1.id] + resting[m.team2.id]) * 20;
                
                // Penalidade se o time acabou de jogar (prefere rotatividade se possível)
                if (consecutive[m.team1.id] > 0) penalty += 50;
                if (consecutive[m.team2.id] > 0) penalty += 50;

                // Pequeno fator aleatório para variar a ordem entre execuções
                penalty += Math.random() * 10;

                if (penalty < minPenalty) {
                    minPenalty = penalty;
                    bestMatchIndex = k;
                }
            }

            // Se por algum motivo extremo não achou (ex: poucos times), pega o primeiro
            if (bestMatchIndex === -1) bestMatchIndex = 0;

            let match = pool.splice(bestMatchIndex, 1)[0];
            orderedMatches.push(match);

            // Atualizar contadores
            teams.forEach(t => {
                if (t.id === match.team1.id || t.id === match.team2.id) {
                    consecutive[t.id]++;
                    resting[t.id] = 0;
                } else {
                    consecutive[t.id] = 0;
                    resting[t.id]++;
                }
            });
        }

        return orderedMatches;
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
