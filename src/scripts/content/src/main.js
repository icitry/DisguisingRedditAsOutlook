import Main from './component/Main.svelte';

const ROOT_ID = 'rto'

const insertAppIntoDom = () => {
  let content = document.createElement('div');
  content.id = ROOT_ID;

  const app = new Main({
    target: content,
    props: { rootId: ROOT_ID }
  });

  document.body.insertBefore(content, document.body.firstChild);
  return app;
}

const app = insertAppIntoDom();

export default app;