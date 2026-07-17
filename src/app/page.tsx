export default function HomePage() {
  return (
    <div className="home-page">
      <section className="event-hero home-hero">
        <div>
          <span className="eyebrow">HMRDTM · Hvor mange er der til mad?</span>
          <h1>Private invitationer og ét samlet gæsteoverblik</h1>
          <p className="home-lead">Planlæg et event, send hver gæst et personligt link, og få svar om deltagelse, komme/gå-tider og måltider — uden at gæsterne skal oprette en konto.</p>
          <div className="button-row"><a className="button" href="/admin">Log ind som arrangør →</a></div>
        </div>
        <div className="event-meta">
          <span>🔗 Personlige invitationslinks</span>
          <span>🔒 Intet gæstelogin</span>
          <span>🗓 Tilføj eventet til kalenderen</span>
        </div>
      </section>

      <section className="card home-story">
        <div>
          <span className="eyebrow">Hvorfor appen findes</span>
          <h2>Et privat alternativ til de store sociale platforme</h2>
        </div>
        <blockquote>
          <p>Når jeg inviterer gæster, vil jeg gerne have alle svar samlet ét sted. Samtidig synes jeg ikke, at mine gæster skal være nødt til at bruge en stor social medieplatform for at fortælle, om de deltager.</p>
          <p>Derfor har jeg lavet HMRDTM: En enkel app, hvor jeg kan sende en personlig invitation via SMS, e-mail eller en anden beskedtjeneste. Gæsten åbner sit link uden login, svarer på invitationen og kan gemme eventet i sin egen kalender.</p>
          <footer>— Rasmus Melin Graasbøll</footer>
        </blockquote>
      </section>

      <section className="home-how-it-works">
        <div className="home-section-heading">
          <span className="eyebrow">Sådan virker det</span>
          <h2>Let for både arrangør og gæst</h2>
          <p>HMRDTM samler det praktiske omkring invitationen, uden at gøre gæsten til bruger af endnu en platform.</p>
        </div>
        <div className="home-feature-grid">
          <article className="home-feature-card"><span aria-hidden="true">✉️</span><div><h3>Send invitationen direkte</h3><p>Arrangøren sender gæstens personlige link via SMS, e-mail eller den kanal, der passer bedst.</p></div></article>
          <article className="home-feature-card"><span aria-hidden="true">👆</span><div><h3>Svar uden login</h3><p>Gæsten åbner linket og svarer Ja, Måske eller Deltager ikke uden konto og password.</p></div></article>
          <article className="home-feature-card"><span aria-hidden="true">🗓</span><div><h3>Gem i egen kalender</h3><p>Eventet kan hentes som en kalenderaftale med et link tilbage til invitationen.</p></div></article>
          <article className="home-feature-card"><span aria-hidden="true">🍽</span><div><h3>Få det samlede overblik</h3><p>Arrangøren kan se deltagere, partner og børn, komme/gå-tider, måltider og kosthensyn ét sted.</p></div></article>
        </div>
      </section>

      <section className="card home-privacy">
        <span aria-hidden="true" className="home-privacy-icon">🔐</span>
        <div><span className="eyebrow">Privat som udgangspunkt</span><h2>Invitationen hører til hos arrangøren og gæsterne</h2><p>Gæsterne behøver ikke en profil på et socialt medie. Deres personlige invitationslink giver kun adgang til den invitation, de har modtaget, og oplysningerne samles i arrangørens egen HMRDTM-installation.</p></div>
      </section>
    </div>
  );
}
