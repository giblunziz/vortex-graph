export class WidgetFactory {
  static templateRepository = new Map();

  static registerTemplate(type, templateId) {
    const tpl = document.getElementById(templateId);
    if (!tpl) {
      alert(`Template '${templateId}' not found in DOM - registerTemplate failed for type '${type}'`);
      return;
    }
    this.templateRepository.set(type, { templateId });
  }

  static createWidget(type) {
    const entry = this.templateRepository.get(type);
    if (!entry) {
      alert(`Widget type '${type}' not registered in WidgetFactory`);
      return null;
    }

    const tpl = document.getElementById(entry.templateId);
    if (!tpl) {
      alert(`Template '${entry.templateId}' not found in DOM (bug build)`);
      return null;
    }

    return tpl.content.cloneNode(true);
  }
}
