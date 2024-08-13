export const handleDataMigration = async () => {
    var version = await game.settings.get('pf2e-bestiary-tracking', 'version');
    if(!version){
        version = '0.8.1';
    }

    if(version === '0.8.1'){
        const bestiary = await game.settings.get('pf2e-bestiary-tracking', 'bestiary-tracking');
        Object.keys(bestiary.monster).forEach(type => {
            Object.keys(bestiary.monster[type]).forEach(monsterKey => {
                const monster = bestiary.monster[type][monsterKey];

                if(!monster.name.value){
                    bestiary.monster[type][monsterKey].name = { revealed: false, value: monster.name };
                }
            });
        });

        await game.settings.set('pf2e-bestiary-tracking', 'bestiary-tracking', bestiary);
        version = '0.8.2';
    }

    await game.settings.set('pf2e-bestiary-tracking', 'version', version);
}