import type { Translation } from "../i18n-types.js";

const fr: Translation = {
	shared: {
		unexpected_interaction_error: "Une erreur inattendue s'est produite pendant le traitement de cette interaction.",
		no_reason_provided: "Aucun détail supplémentaire n'a été fourni.",
		claim_status: {
			claimed_by: "Pris en charge par <@{userId}>",
			unclaimed: "Non pris en charge"
		},
		transcript_status: {
			ready: "[Ouvrir la transcription]({url})",
			unavailable: "Indisponible ou encore en cours de traitement."
		}
	},
	commands: {
		add: {
			description: "Ajouter quelqu'un au ticket actuel",
			options: {
				user: {
					description: "L'utilisateur à ajouter"
				}
			},
			choose_user: "Choisissez un utilisateur à ajouter à ce ticket.",
			already_has_access: "Cet utilisateur a déjà accès à ce ticket.",
			already_invited: "Cet utilisateur est déjà invité dans ce ticket.",
			invite_limit_reached: "Vous ne pouvez pas inviter plus de {limit} utilisateurs dans un ticket.",
			success: "<@{userId}> a été ajouté à ce ticket."
		},
		claim: {
			description: "Prendre en charge le ticket actuel",
			disabled: "La prise en charge des tickets est désactivée.",
			already_claimed: "Vous avez déjà pris en charge ce ticket.",
			cannot_take_over: "Ce ticket est déjà pris en charge et ne peut pas être repris.",
			only_staff: "Seul le staff peut prendre en charge ce ticket.",
			success: "Vous avez pris en charge ce ticket.",
			reassigned: "Le ticket a été réattribué à <@{userId}>."
		},
		close: {
			description: "Fermer le ticket actuel"
		},
		cleardm: {
			description: "Effacer l'historique des tickets du bot dans vos MP",
			starting: "Suppression de votre historique de tickets en MP...",
			dm_unavailable: "Je n'ai pas pu accéder à votre salon MP.",
			cleared: "{count} messages de ticket ont été supprimés de vos MP.",
			none_found: "Aucun message de ticket n'a été trouvé dans vos MP."
		},
		mass_add: {
			description: "Ajouter plusieurs utilisateurs au ticket actuel",
			options: {
				users: {
					description: "IDs d'utilisateurs ou mentions séparés par des virgules"
				}
			},
			provide_users: "Fournissez au moins un ID utilisateur ou une mention.",
			summary: {
				added: "Ajoutés: {mentions}.",
				none_added: "Aucun utilisateur n'a été ajouté.",
				skipped_existing: "{count} utilisateur(s) déjà autorisé(s) ont été ignorés.",
				skipped_invalid: "{count} ID(s) utilisateur invalides ont été ignorés.",
				limit_reached: "Arrêt lorsque la limite de {limit} utilisateurs par ticket a été atteinte."
			}
		},
		remove: {
			description: "Retirer des utilisateurs invités du ticket actuel",
			options: {
				user: {
					description: "L'utilisateur invité à retirer immédiatement"
				}
			},
			no_invited_users: "Il n'y a aucun utilisateur invité à retirer de ce ticket.",
			select_users: "Sélectionnez les utilisateurs invités à retirer de ce ticket.",
			select_placeholder: "Choisir des utilisateurs à retirer",
			not_invited: "Ces utilisateurs ne sont pas invités dans ce ticket.",
			success: "{mentions} ont été retirés de ce ticket."
		},
		rename: {
			description: "Renommer le ticket actuel",
			options: {
				name: {
					description: "Le nouveau nom du salon du ticket"
				}
			},
			only_staff: "Seul le staff peut renommer ce ticket.",
			provide_name: "Fournissez un nouveau nom de ticket.",
			success: "Le ticket a été renommé en <#{channelId}>."
		},
		unclaim: {
			description: "Libérer le ticket actuel",
			disabled: "La libération des tickets est désactivée pour ce serveur.",
			not_claimed: "Ce ticket n'est pas pris en charge.",
			only_current_claimer: "Seul le membre qui a pris en charge ce ticket peut le libérer.",
			success: "Vous avez libéré ce ticket."
		}
	},
	tickets: {
		records: {
			not_ticket_channel: "Cette interaction n'a pas été utilisée dans un salon de ticket.",
			not_open_ticket: "Ce salon n'est pas un ticket ouvert.",
			already_closed: "Ce ticket est déjà fermé."
		},
		panel: {
			no_visible_types: "Vous n'avez accès à aucun type de ticket sur ce panneau.",
			select_type: "Veuillez sélectionner un type de ticket.",
			unavailable_type: "Ce type de ticket n'est pas disponible depuis ce panneau.",
			select_placeholder: "Sélectionner un type de ticket"
		},
		open: {
			not_allowed_type: "Vous n'êtes pas autorisé à créer ce type de ticket.",
			unavailable_type: "Ce type de ticket n'est pas disponible depuis ce panneau.",
			max_open_reached: "Vous avez déjà atteint le nombre maximum de tickets ouverts ({limit}).",
			created: "Votre ticket a été créé : <#{channelId}>",
			question_answer: "{label} : {answer}"
		},
		claim: {
			only_staff: "Seul le staff peut prendre en charge ce ticket."
		},
		actions: {
			close_ticket: "Fermer le ticket",
			claim_ticket: "Prendre en charge",
			unclaim_ticket: "Libérer le ticket",
			delete_ticket: "Supprimer le ticket"
		},
		close: {
			delete_channel_start: "Suppression du salon du ticket...",
			modal: {
				title: "Fermer le ticket",
				reason_label: "Raison",
				reason_placeholder: "Pourquoi ce ticket est-il fermé ?"
			},
			status: {
				preparing_transcript: "Préparation de la transcription...",
				closing_ticket: "Fermeture du ticket...",
				updating_access: "Mise à jour des accès au ticket...",
				transcript_still_processing: "La transcription est encore en cours. Fin de la fermeture du ticket...",
				sending_close_confirmation: "Envoi de la confirmation de fermeture...",
				sending_close_updates: "Envoi des mises à jour de fermeture...",
				posting_close_summary: "Publication du résumé de fermeture...",
				closed: "Ticket fermé."
			},
			deleted_with_transcript: "Ticket fermé. La transcription est prête et le salon va maintenant être supprimé.",
			deleted_without_transcript: "Ticket fermé. Le salon va maintenant être supprimé.",
			only_staff: "Seul le staff peut fermer ce ticket.",
			must_be_claimed: "Ce ticket doit être pris en charge avant de pouvoir être fermé.",
			only_current_claimer: "Seul le membre qui a pris en charge ce ticket peut le fermer.",
			not_ticket: "Ce salon n'est pas un ticket.",
			only_closed_delete: "Seuls les tickets fermés peuvent être supprimés depuis ce bouton.",
			only_staff_delete: "Seul le staff peut supprimer ce ticket."
		},
		transcript: {
			collecting_messages: "Collecte des messages du ticket...",
			creating: "Création de la transcription...",
			uploading: "Envoi de la transcription...",
			uploading_avatars: "Envoi des avatars...",
			uploading_attachments: "Envoi des pièces jointes...",
			progress: "{label} ({completed}/{total})"
		},
		templates: {
			open_panel: {
				title: "## Ouvrir un ticket",
				description: "Choisissez la catégorie correspondant à votre demande et le bot créera un ticket privé pour vous."
			},
			ticket_opened: {
				title: "## Ticket {ticketTypeName}",
				intro: "Merci d'avoir ouvert un ticket.",
				details_label: "**Détails**\n{reason}",
				claim_status: "**Statut de prise en charge** : {claimStatus}"
			},
			ticket_opened_general: {
				title: "## Ticket d'assistance générale",
				intro: "Un membre du support examinera votre demande sous peu.",
				details_label: "**Résumé**\n{reason}",
				claim_status: "**Statut de prise en charge** : {claimStatus}"
			},
			ticket_opened_billing: {
				title: "## Ticket de facturation",
				intro: "Incluez les numéros de facture, le moyen de paiement et les détails des transactions en échec.",
				details_label: "**Détails envoyés**\n{reason}",
				claim_status: "**Statut de prise en charge** : {claimStatus}"
			},
			ticket_opened_report: {
				title: "## Ticket de signalement",
				intro: "L'équipe de modération examinera le signalement et les preuves jointes.",
				details_label: "**Détails du signalement**\n{reason}",
				claim_status: "**Statut de prise en charge** : {claimStatus}"
			},
			ticket_closed: {
				title: "## Ticket fermé",
				subtitle: "Le ticket de <@{userId}> a été fermé.",
				details: "**Raison** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_general: {
				title: "## Assistance générale fermée",
				subtitle: "Le ticket d'assistance générale de <@{userId}> est maintenant fermé.",
				details: "**Raison** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_billing: {
				title: "## Ticket de facturation fermé",
				subtitle: "Le ticket de facturation de <@{userId}> a été fermé.",
				details:
					"**Raison de fermeture** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_report: {
				title: "## Dossier de signalement fermé",
				subtitle: "Le signalement ouvert par <@{userId}> a été fermé.",
				details: "**Note de résolution** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_dm: {
				title: "## Votre ticket a été fermé",
				details: "**Raison** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_dm_general: {
				title: "## Votre ticket d'assistance générale a été fermé",
				details: "**Raison** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_dm_billing: {
				title: "## Votre ticket de facturation a été fermé",
				intro:
					"Si vous avez encore besoin d'aide, ouvrez un nouveau ticket de facturation et ajoutez de nouveau les détails de votre commande.",
				details: "**Raison** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			},
			ticket_closed_dm_report: {
				title: "## Votre ticket de signalement a été fermé",
				intro: "Le staff a examiné le signalement et les preuves jointes.",
				details: "**Note de résolution** : {reason}\n**Prise en charge** : {claimStatus}\n**Transcription** : {transcriptStatus}",
				closed_by: "-# _Fermé par {closerName}_"
			}
		}
	},
	logs: {
		duration: {
			day_short: "j",
			hour_short: "h",
			minute_short: "m",
			second_short: "s"
		},
		templates: {
			ticket_created: {
				title: "## Ticket créé",
				action: "{actorMention} a ouvert {ticketChannelMention}.",
				details:
					"**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**Créé** : {createdAt}\n**Raison** : {reason}"
			},
			ticket_claimed: {
				title: "## Ticket pris en charge",
				action: "{actorMention} a pris en charge {ticketChannelMention}.",
				details: "**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**Ancienneté** : {ticketAge}"
			},
			ticket_unclaimed: {
				title: "## Ticket libéré",
				action: "{actorMention} a libéré {ticketChannelMention}.",
				details: "**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**Ancienneté** : {ticketAge}"
			},
			ticket_closed: {
				title: "## Ticket fermé",
				action: "{actorMention} a fermé {ticketChannelMention}.",
				details:
					"**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**Statut de prise en charge** : {claimStatus}\n**Ancienneté** : {ticketAge}\n**Raison** : {reason}\n**Transcription** : {transcriptStatus}"
			},
			ticket_deleted: {
				title: "## Ticket supprimé",
				action: "{actorMention} a supprimé {ticketChannelMention}.",
				details:
					"**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**Statut de prise en charge** : {claimStatus}\n**Ancienneté** : {ticketAge}\n**Raison de fermeture** : {reason}\n**Transcription** : {transcriptStatus}"
			},
			ticket_renamed: {
				title: "## Ticket renommé",
				action: "{actorMention} a renommé {ticketChannelMention}.",
				details:
					"**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}\n**De** : `{oldChannelName}`\n**Vers** : `{newChannelName}`"
			},
			user_added: {
				title: "## Utilisateur ajouté",
				action: "{actorMention} a ajouté {targetMention} à {ticketChannelMention}.",
				details: "**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}"
			},
			user_removed: {
				title: "## Utilisateur retiré",
				action: "{actorMention} a retiré {targetMention} de {ticketChannelMention}.",
				details: "**Ticket** : #{ticketId} - {ticketTypeName}\n**Ouvert par** : {createdByMention}"
			}
		}
	}
};

export default fr;
