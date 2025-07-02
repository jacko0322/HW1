// NBA資料收集腳本
// 適用於BALLDONTLIE API

// 設定API
const API_CONFIG = {
    baseURL: 'https://api.balldontlie.io/v1',
    apiKey: '80d11dc4-c068-483c-a4d3-cd09b788e03a', // 在這裡放入你的API金鑰
    headers: {
        'Authorization': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json'
    }
};

// 資料收集類別
class NBADataCollector {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = API_CONFIG.baseURL;
        this.headers = {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        };
        this.collectedData = {
            players: [],
            teams: [],
            games: [],
            stats: []
        };
    }

    // 通用API請求方法
    async makeAPIRequest(endpoint, params = {}) {
        try {
            const url = new URL(`${this.baseURL}${endpoint}`);
            
            // 添加查詢參數
            Object.keys(params).forEach(key => {
                if (Array.isArray(params[key])) {
                    params[key].forEach(value => {
                        url.searchParams.append(`${key}[]`, value);
                    });
                } else {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`API請求失敗: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API請求錯誤:', error);
            throw error;
        }
    }

    // 1. 收集所有球隊資料
    async collectTeams() {
        console.log('📥 開始收集球隊資料...');
        try {
            const response = await this.makeAPIRequest('/teams');
            this.collectedData.teams = response.data;
            console.log(`✅ 成功收集 ${response.data.length} 支球隊資料`);
            return response.data;
        } catch (error) {
            console.error('❌ 收集球隊資料失敗:', error);
            return [];
        }
    }

    // 2. 收集現役球員資料
    async collectActivePlayers(options = {}) {
        console.log('📥 開始收集現役球員資料...');
        const allPlayers = [];
        let cursor = null;
        let pageCount = 0;

        try {
            do {
                const params = {
                    per_page: 100,
                    ...options
                };
                
                if (cursor) {
                    params.cursor = cursor;
                }

                const response = await this.makeAPIRequest('/players/active', params);
                allPlayers.push(...response.data);
                cursor = response.meta?.next_cursor;
                pageCount++;
                
                console.log(`📄 已收集第 ${pageCount} 頁，共 ${allPlayers.length} 名球員`);
                
                // API速率限制保護 (免費版每分鐘30次)
                await this.delay(2000);
                
            } while (cursor && pageCount < 50); // 限制最多50頁防止無限循環

            this.collectedData.players = allPlayers;
            console.log(`✅ 成功收集 ${allPlayers.length} 名現役球員資料`);
            return allPlayers;
        } catch (error) {
            console.error('❌ 收集球員資料失敗:', error);
            return allPlayers;
        }
    }

    // 3. 收集特定球員的詳細統計
    async collectPlayerStats(playerIds, season = 2024) {
        console.log(`📥 開始收集球員統計資料 (${season}賽季)...`);
        try {
            const params = {
                player_ids: playerIds,
                seasons: [season],
                per_page: 100
            };

            const response = await this.makeAPIRequest('/stats', params);
            const stats = response.data;
            
            this.collectedData.stats.push(...stats);
            console.log(`✅ 成功收集 ${stats.length} 筆統計資料`);
            return stats;
        } catch (error) {
            console.error('❌ 收集統計資料失敗:', error);
            return [];
        }
    }

    // 4. 收集賽季平均數據
    async collectSeasonAverages(playerIds, season = 2024) {
        console.log(`📥 開始收集賽季平均數據...`);
        try {
            const params = {
                season: season,
                season_type: 'regular',
                type: 'base',
                player_ids: playerIds
            };

            const response = await this.makeAPIRequest('/season_averages/general', params);
            console.log(`✅ 成功收集賽季平均數據`);
            return response.data;
        } catch (error) {
            console.error('❌ 收集賽季平均數據失敗:', error);
            return [];
        }
    }

    // 5. 收集特定日期的比賽資料
    async collectGamesByDate(date) {
        console.log(`📥 收集 ${date} 的比賽資料...`);
        try {
            const params = { dates: [date] };
            const response = await this.makeAPIRequest('/games', params);
            
            this.collectedData.games.push(...response.data);
            console.log(`✅ 成功收集 ${response.data.length} 場比賽資料`);
            return response.data;
        } catch (error) {
            console.error('❌ 收集比賽資料失敗:', error);
            return [];
        }
    }

    // 6. 收集聯盟領袖資料
    async collectLeaders(statType = 'pts', season = 2024) {
        console.log(`📥 收集 ${statType} 排行榜 (${season}賽季)...`);
        try {
            const params = {
                stat_type: statType,
                season: season
            };

            const response = await this.makeAPIRequest('/leaders', params);
            console.log(`✅ 成功收集 ${statType} 排行榜`);
            return response.data;
        } catch (error) {
            console.error('❌ 收集排行榜失敗:', error);
            return [];
        }
    }

    // 7. 收集球員傷病資料
    async collectPlayerInjuries() {
        console.log('📥 收集球員傷病資料...');
        try {
            const response = await this.makeAPIRequest('/player_injuries');
            console.log(`✅ 成功收集 ${response.data.length} 筆傷病資料`);
            return response.data;
        } catch (error) {
            console.error('❌ 收集傷病資料失敗:', error);
            return [];
        }
    }

    // 延遲函數 (避免API速率限制)
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 將資料儲存為JSON格式
    saveToJSON(filename = 'nba_data.json') {
        const jsonData = JSON.stringify(this.collectedData, null, 2);
        
        // 在瀏覽器環境中，創建下載連結
        if (typeof window !== 'undefined') {
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`✅ 資料已儲存為 ${filename}`);
        } else {
            // Node.js環境
            const fs = require('fs');
            fs.writeFileSync(filename, jsonData);
            console.log(`✅ 資料已儲存為 ${filename}`);
        }
    }

    // 顯示收集到的資料摘要
    showDataSummary() {
        console.log('\n📊 資料收集摘要:');
        console.log(`🏀 球隊數量: ${this.collectedData.teams.length}`);
        console.log(`👥 球員數量: ${this.collectedData.players.length}`);
        console.log(`🏆 比賽數量: ${this.collectedData.games.length}`);
        console.log(`📈 統計資料: ${this.collectedData.stats.length}`);
        
        // 顯示一些範例資料
        if (this.collectedData.players.length > 0) {
            console.log('\n👨‍💼 前3名球員範例:');
            this.collectedData.players.slice(0, 3).forEach((player, index) => {
                console.log(`${index + 1}. ${player.first_name} ${player.last_name} - ${player.team?.full_name || '無隊伍'}`);
            });
        }
    }
}

// 使用範例
async function collectNBAData() {
    // 替換為你的API金鑰
    const apiKey = 'YOUR_API_KEY_HERE';
    const collector = new NBADataCollector(apiKey);

    try {
        // 收集基本資料
        await collector.collectTeams();
        await collector.collectActivePlayers();
        
        // 收集統計資料 (可選)
        const topPlayers = collector.collectedData.players.slice(0, 10);
        const playerIds = topPlayers.map(p => p.id);
        
        await collector.collectPlayerStats(playerIds);
        await collector.collectSeasonAverages(playerIds);
        
        // 收集其他資料
        await collector.collectLeaders('pts'); // 得分王
        await collector.collectLeaders('reb'); // 籃板王
        await collector.collectLeaders('ast'); // 助攻王
        
        await collector.collectPlayerInjuries();
        
        // 顯示摘要並儲存
        collector.showDataSummary();
        collector.saveToJSON('nba_complete_data.json');
        
        console.log('\n🎉 資料收集完成!');
        return collector.collectedData;
        
    } catch (error) {
        console.error('💥 資料收集過程中發生錯誤:', error);
    }
}

// 針對特定需求的快速收集函數
async function quickCollectPlayers(apiKey, searchTerm = '') {
    const collector = new NBADataCollector(apiKey);
    
    const options = searchTerm ? { search: searchTerm } : {};
    const players = await collector.collectActivePlayers(options);
    
    return players;
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NBADataCollector, collectNBAData, quickCollectPlayers };
}