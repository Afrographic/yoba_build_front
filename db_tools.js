class DB_Tools {
    static from_sequelize_to_type_orm(query, replacements) {
        // build new query schema
        const regex = /:[a-zA-Z_]+/gi;
        let new_query = query.replaceAll(regex, "?");

        // build new replacement schema
        let new_replacements = [];
        if (Array.isArray(replacements)) {
            new_replacements = replacements;
        } else {
            for (const item in replacements) {
                new_replacements.push(replacements[item]);
            }
        }

        // return new request schema
        return { new_query, new_replacements };

    }
}

module.exports.DB_Tools = DB_Tools;