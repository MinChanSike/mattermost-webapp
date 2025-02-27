// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Group: @enterprise @onboarding

import {stubClipboard} from '../../utils';
import {spyNotificationAs} from '../../support/notification';

describe('Onboarding - User', () => {
    let townSquarePage;
    let user;

    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {EnableOnboardingFlow: true},
        });

        cy.apiInitSetup().then(({user: newUser, townSquareUrl}) => {
            townSquarePage = townSquareUrl;
            user = newUser;

            cy.apiLogin(user);
        });
    });

    beforeEach(() => {
        const preference = {
            user_id: user.id,
            category: 'recommended_next_steps',
            value: 'false',
        };
        const tipsSteps = [
            'complete_profile',
            'notification_setup',
            'team_setup',
            'invite_members',
            'download_apps',
            'hide',
            'skip',
        ];

        cy.apiSaveUserPreference(tipsSteps.map((step) => ({...preference, name: step})));
        cy.visit(townSquarePage);
    });

    it('User - Happy Path', () => {
        // * Make sure tips view has loaded
        cy.url().should('include', 'tips');

        // # Use to grant permission to Notification
        spyNotificationAs('withNotification', 'granted');

        // * Check to make sure card is expanded
        cy.get('.Card__body.expanded .CompleteProfileStep').should('be.visible');

        // # Enter full name
        cy.get('#input_fullName').should('be.visible').clear().type('Theodore Logan');

        // # Select profile picture
        cy.findByTestId('PictureSelector__input-CompleteProfileStep__profilePicture').attachFile('mattermost-icon.png');

        // # Click Save profile button
        cy.findByTestId('CompleteProfileStep__saveProfileButton').should('be.visible').and('not.be.disabled').click();

        // * Step counter should increment
        cy.get('.SidebarNextSteps .SidebarNextSteps__middle').should('contain', '1 / 4 steps complete');

        // * Check to make sure card is expanded
        cy.findByText('We recommend enabling desktop notifications so you don’t miss any important communications.').should('be.visible');

        cy.findByRole('button', {name: 'Set up notifications'}).should('be.visible').click();

        // * Step counter should increment
        cy.get('.SidebarNextSteps .SidebarNextSteps__middle').should('contain', '2 / 4 steps complete');

        // * Check to make sure card is expanded
        cy.get('.Card__body.expanded .InviteMembersStep').should('be.visible');

        // # Click Finish button
        cy.findByTestId('InviteMembersStep__finishButton').scrollIntoView().should('be.visible').and('not.be.disabled').click();

        // * Check to make sure card is expanded
        cy.get('.Card__body.expanded .NextStepsView__download').should('be.visible');

        // # Click Finish button
        cy.findByTestId('DownloadAppsStep__finishDownload').should('be.visible').and('not.be.disabled').click();

        // * Transition screen should be visible
        cy.get('.NextStepsView__transitionView.transitioning').should('be.visible');
    });

    it('User - Switch to Next Step', () => {
        // * Make sure tips view has loaded
        cy.url().should('include', 'tips');

        // * Check to make sure card is expanded
        cy.get('.Card__body.expanded .CompleteProfileStep').should('be.visible');

        // # Click the header of the next card
        cy.get('.Card.expanded + .Card button.NextStepsView__cardHeader').should('be.visible').click();

        // * Check to make sure next card is expanded and current card is collapsed
        cy.get('.Card__body:not(.expanded) .CompleteProfileStep').should('exist').should('not.be.visible');
        cy.findByText('We recommend enabling desktop notifications so you don’t miss any important communications.').should('be.visible');

        // * Step counter should not increment
        cy.get('.SidebarNextSteps .SidebarNextSteps__middle').should('contain', '0 / 4 steps complete');
    });

    it('User - Skip Getting Started', () => {
        // * Make sure tips view has loaded
        cy.url().should('include', 'tips');

        // * Check to make sure first card is expanded
        cy.get('.Card__body.expanded .CompleteProfileStep').should('be.visible');

        // # Click 'Skip Getting Started'
        cy.findByRole('button', {name: 'Skip Getting Started'}).scrollIntoView().should('be.visible').click();

        // * Main screen should be out of view and transition screen should be visible
        cy.get('.NextStepsView__transitionView.transitioning').should('be.visible');
    });

    it('User - Remove Recommended Next Steps', () => {
        // * Make sure tips view has loaded
        cy.url().should('include', 'tips');

        // * Check to make sure first card is expanded
        cy.findByText('Complete your profile').should('be.visible');

        // # Click the 'x' in the Sidebar Next Steps section
        cy.get('button.SidebarNextSteps__close').should('be.visible').click();

        // * Verify confirmation modal has appeared
        cy.get('.RemoveNextStepsModal').should('be.visible').should('contain', 'Remove Getting Started');

        // # Click 'Remove'
        cy.get('.RemoveNextStepsModal button.GenericModal__button.confirm').should('be.visible').click();

        // * Verify the sidebar section and the main view are gone and the channel view is back
        cy.get('.SidebarNextSteps').should('not.exist');
        cy.get('.app__content:not(.NextStepsView)').should('be.visible');

        // # Click 'Getting Started' in the help menu
        cy.uiOpenHelpMenu('Getting Started');

        // * Verify that sidebar element and next steps view are back
        cy.get('.SidebarNextSteps').should('be.visible');
        cy.get('.app__content.NextStepsView').should('be.visible');
    });

    it('User - Copy Invite Link', () => {
        cy.apiCreateTeam('team').then(({team}) => {
            cy.visit(`/${team.name}/tips`);

            // # Stub out clipboard
            stubClipboard().as('clipboard');

            // # Get invite link
            const baseUrl = Cypress.config('baseUrl');
            const inviteLink = `${baseUrl}/signup_user_complete/?id=${team.invite_id}`;

            // * Verify initial state
            cy.get('@clipboard').its('wasCalled').should('eq', false);
            cy.get('@clipboard').its('contents').should('eq', '');

            // * Make sure tips view has loaded
            cy.url().should('include', `/${team.name}/tips`);

            // # Click Invite members to the team header
            cy.get('button.NextStepsView__cardHeader:contains(Invite members to the team)').scrollIntoView().should('be.visible').click();

            // * Check to make sure card is expanded
            cy.get('.Card__body.expanded .InviteMembersStep').should('be.visible');

            // * Verify correct invite link is displayed
            cy.findByTestId('InviteMembersStep__shareLinkInput').should('be.visible').and('have.value', `${baseUrl}/signup_user_complete/?id=${team.invite_id}`);

            // # Click Copy Link
            cy.findByTestId('InviteMembersStep__shareLinkInputButton').should('be.visible').and('contain', 'Copy Link').click();

            // * Verify that button reads Copied
            cy.findByTestId('InviteMembersStep__shareLinkInputButton').should('be.visible').and('contain', 'Copied');

            // * Verify if it's called with correct link value
            cy.get('@clipboard').its('wasCalled').should('eq', true);
            cy.get('@clipboard').its('contents').should('eq', inviteLink);
        });
    });
});
