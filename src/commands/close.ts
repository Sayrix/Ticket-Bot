import { CommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { closeAskReason } from "../utils/close_askReason";
import {close} from "../utils/close.js";
import {BaseCommand, ExtendedClient} from "../structure";

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

export default class CloseCommand extends BaseCommand {
    public static data: SlashCommandBuilder = <SlashCommandBuilder>new SlashCommandBuilder()
        .setName("close").setDescription("Close the ticket");
    constructor(client: ExtendedClient) {
        super(client);
    }

    async execute(interaction: CommandInteraction) {
        if (
            this.client.config.closeOption.whoCanCloseTicket === "STAFFONLY" &&
			!(interaction.member as GuildMember | null)?.roles.cache.some((r) => this.client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))
        )
            return interaction
                .reply({
                    content: this.client.locales.getValue("ticketOnlyClosableByStaff"),
                    ephemeral: true,
                })
                .catch((e) => console.log(e));

        if (this.client.config.closeOption.askReason) {
            closeAskReason(interaction, this.client);
        } else {
            await interaction.deferReply().catch((e) => console.log(e));
            close(interaction, this.client);
        }	}
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
