import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';



const FeatureList = [
  {
    title: '⚡ Reliability Engineering',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Build resilient systems with SRE practices, monitoring, observability,
        and incident response strategies.
      </>
    ),
  },
  {
    title: '🤖 AI & Machine Learning',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Explore machine learning algorithms, neural networks, and AI 
        applications in modern software development.
      </>
    ),
  },
  {
    title: '🔒 Cybersecurity',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Learn security best practices, threat detection, and how to build
        secure, resilient systems and applications.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
