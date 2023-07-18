import {BaseCommand, ExtendedClient} from "../structure";
import {claim} from "../utils/claim";
import {CommandInteraction, SlashCommandBuilder} from "discord.js";

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

export default class ClaimCommand extends BaseCommand {
    public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
        .setName("claim").setDescription("Set the ticket as claimed.");
    constructor(client: ExtendedClient) {
        super(client);
    }

    async execute(interaction: CommandInteraction) {
        return claim(interaction, this.client);
    }
}

/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/