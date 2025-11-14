export function HowItWorksSection() {
  const steps = [
    {
      name: 'Clone & Deploy',
      description: 'Get your copy of the repository and deploy it to Vercel in seconds.',
    },
    {
      name: 'Customize',
      description: 'Modify the content, styling, and components to fit your brand.',
    },
    {
      name: 'Launch',
      description: 'Your new landing page is ready to capture leads and impress users.',
    },
  ];

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Get Started in 3 Easy Steps</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Launch your project faster than ever before.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
           <div className="absolute top-8 left-0 w-full h-px bg-border -z-10 hidden md:block" />
           <div className="absolute top-8 left-0 w-full h-full flex justify-between items-start -z-10 hidden md:flex">
             <div className="w-1/3" />
             <div className="w-px h-full bg-border" />
             <div className="w-1/3" />
             <div className="w-px h-full bg-border" />
             <div className="w-1/3" />
           </div>
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background border-2 border-primary text-primary mb-6 shadow-lg">
                <span className="text-2xl font-bold font-headline">{index + 1}</span>
              </div>
              <h3 className="text-xl font-semibold font-headline mb-2">{step.name}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
