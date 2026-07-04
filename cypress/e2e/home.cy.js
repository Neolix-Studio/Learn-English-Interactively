describe('Homepage Test', () => {
  it('loads the homepage successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});
